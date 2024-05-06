// ==UserScript==
// @name         Grafana Fire Investigator
// @version      2024-05-05
// @description  clew-searcher is a tool find the clews of unnormal metrics' root cause in the grafana.
// @author       you06
// @match        http://127.0.0.1:3000/d/*
// @icon         https://blog2.tongmu.me/icon-96x96.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    const debugMode = true
    const MIN_DISTANCE = 1e-10
    const MAX_WAIT_SECONDS = 60

    setInterval(() => {
        document.querySelectorAll('.grafana-app .dashboard-content .panel-wrapper').forEach((panel: any) => {
            const header = panel.querySelector('.panel-header .panel-title-container')
            if (!header) {
                return
            }
            if (header.querySelector('.clew-searcher-btn')) {
                return
            }
            const panelId = parseInt(panel.parentNode.id.split('-')[1])
            const title = panel.querySelector('.panel-title-text').innerHTML
            const button = document.createElement('button')
            button.className = 'clew-searcher-btn'
            button.innerText = 'Search'
            const cssText = [
                'position: absolute; right: 0.5em; top: 0; cursor: pointer;',
                'color: #000'
            ].join('')
            button.style.cssText = cssText
            header.appendChild(button)
            button.addEventListener('click', function(e) {
                e.stopPropagation()
                searcher.searchClew(e, panelId, title)
            })
        })
    }, 1000)

    class ClewSearcher {
        isRunning: Boolean = false
        timeSrv: TimeSrv
        groupMap: {[key: number]: string}

        constructor() {}

        async searchClew(e: any, panelId: number, title: string): Promise<void> {
            if (this.isRunning) {
                return
            }
            this.isRunning = true
            debug('click', panelId, title)
            this.timeSrv = ($(document) as any).injector().get('timeSrv') as TimeSrv
            {
                const timeRange = this.timeSrv.timeRange()
                const {from, to} = timeRange.raw
                if (from.toString().includes('now') || to.toString().includes('now')) {
                    console.log('time range is not fixed, please fix it first')
                    this.isRunning = false
                    return
                }
            }
            const dashboard = this.timeSrv.dashboard
            let basePanelResult: PanelResult
            for (let id = 0; id < dashboard.panels.length; id++) {
                if (dashboard.panels[id].title === title && dashboard.panels[id].id === panelId) {
                    const panel = dashboard.getPanelById(panelId)
                    if (!panel.queryRunner) {
                        console.log('this is not a query panel')
                        return
                    }
                    const result = panel.queryRunner.getLastResult()
                    basePanelResult = {
                        panel,
                        result
                    }
                    break
                }
            }
            if (!basePanelResult) {
                return
            }
            debug('search clew of', title, basePanelResult)
            const headPanalResults: PanelResult[] = await this.readAllMetrics(basePanelResult)
            debug('metrics read done, check `window.headPanalResults` and `window.basePanelResult')
            if (debugMode) {
                (window as any).headPanalResults = headPanalResults as any
                (window as any).basePanelResult = basePanelResult
            }
            debug('calculation distance start')
            const rankedPanels = rankMetrics(basePanelResult, headPanalResults, euclidean_distance_curve)
            debug('calculation distance done')
            for (let i = 0; i < rankedPanels.length; i++) {
                if (i >= 10) {
                    break
                }
                console.log(`rank ${i+1}, score: ${rankedPanels[i].score}, group: ${this.groupMap[rankedPanels[i].panel.id]}, panel: ${rankedPanels[i].panel.title}, series: ${rankedPanels[i].lowestSeriesName}`)
            }
            this.isRunning = false
        }

        async readAllMetrics(basePanel: PanelResult): Promise<PanelResult[]> {
            // expand rows to get the latest data
            const timeSrv = this.timeSrv
            timeSrv.dashboard.expandRows()
            timeSrv.dashboard.startRefresh()
            
            await sleep(1000)
            const scrollView = document.querySelector('.dashboard-container .dashboard-scroll .scrollbar-view')
            const {scrollHeight, scrollTop} = scrollView
            scrollView.scrollTo(0, 0)
            for (let i = 0; i < scrollHeight; i += 50) {
                await sleep(10)
                scrollView.scrollTo(0, i)
            }
            // TODO: back to current scroll position
            scrollView.scrollTo(0, 0)

            this.groupMap = panelsGroupMap(timeSrv.dashboard.panels)

            const panelSeriesFutures: Promise<PanelResult>[] = timeSrv.dashboard.panels
                .map(async (panel) => {
                    if (!panel.queryRunner || panel.id === basePanel.panel.id || panel.type === 'row') {
                        return undefined
                    }
                    for (let i = 0; i < MAX_WAIT_SECONDS; i++) {
                        const result = panel.queryRunner.getLastResult()
                        if (!(checkTimeSeries(result) && compareTimeSeries(basePanel.result, result))) {
                            await sleep(1000)
                            continue
                        }
                        return {
                            panel,
                            result
                        }
                    }
                })
            const panelSeries = await Promise.all(panelSeriesFutures)
            timeSrv.dashboard.collapseRows()
            return panelSeries.filter((series) => series !== undefined)
        }
    }

    const searcher = new ClewSearcher()

    function extractTimeValues(series: Series): number[] {
        const timeField = series.fields.find((item) => item.name === 'Time' && item.type === 'time')
        if (!timeField) {
            return null
        }
        return timeField.values.buffer
    }

    function extractQueryValues(series: Series): number[] {
        const queryField = series.fields.find((item) => item.name === 'Value' && item.type === 'number')
        if (!queryField) {
            return null
        }
        return queryField.values.buffer
    }

    function checkTimeSeries(result: Result) {
        if (result.series.length === 0) {
            return false
        }
        const first = result.series[0]
        const firstTimeValues = extractTimeValues(first)
        if (!firstTimeValues) {
            return false
        }
        for (let i = 1; i < result.series.length; i++) {
            const rest = result.series[i]
            const restTimeValues = extractTimeValues(rest)
            if (!restTimeValues) {
                return false
            }
            for (let j = 0; j < firstTimeValues.length; j++) {
                if (firstTimeValues[j] !== restTimeValues[j]) {
                    return false
                }
            }
        }
        return true
    }

    function compareTimeSeries(baseResult: Result, headResult: Result): Boolean {
        const baseTimeValues = extractTimeValues(baseResult.series[0])
        const headTimeValues = extractTimeValues(headResult.series[0])
        if (!baseTimeValues || !headTimeValues) {
            return false
        }
        if (baseTimeValues.length !== headTimeValues.length) {
            return false
        }
        for (let i = 0; i < baseTimeValues.length; i++) {
            if (baseTimeValues[i] !== headTimeValues[i]) {
                return false
            }
        }
        return true
    }

    function rankMetrics(basePanelResult: PanelResult, headPanelResults: PanelResult[], distanceCalculator: DistanceCalculator): ScoredPanel[] {
        const scoredResults = headPanelResults.map((headPanelResult) => {
            const scoredResult = {
                panel: headPanelResult.panel,
                score: -1,
                lowestSeriesName: ''
            }
            for (const headSeries of headPanelResult.result.series) {
                for (const baseSeries of basePanelResult.result.series) {
                    const headValues = extractQueryValues(headSeries)
                    const baseValues = extractQueryValues(baseSeries)
                    if (!headValues || !baseValues) {
                        continue
                    }
                    const distance = distanceCalculator(baseValues, headValues)
                    if (scoredResult.score === -1 || distance < scoredResult.score) {
                        scoredResult.score = distance
                        scoredResult.lowestSeriesName = headSeries.name
                    }
                }
            }
            return scoredResult
        }).filter((scoredResult) => scoredResult.score !== -1
            && scoredResult.score < Number.MAX_VALUE
            && scoredResult.score > MIN_DISTANCE)
        scoredResults.sort((a, b) => a.score - b.score)
        return scoredResults
    }
    
    function panelsGroupMap(panels: Panel[]): {[key: number]: string} {
        const m: {[key: number]: string} = {}
        let groupName = ''
        for (const panel of panels) {
            if (panel.type === 'row') {
                groupName = panel.title
                continue
            }
            m[panel.id] = groupName
        }
        return m
    }

    function debug(...args: any[]): void {
        if (debugMode) {
            console.log('[DEBUG]', new Date().toTimeString(), ...args)
        }
    }

    async function sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    function euclidean_distance_curve (base: number[], head: number[]): number {
        let maxBase, maxHead
        for (let i = 0; i < base.length; i++) {
            if (!maxBase) {
                maxBase = Math.abs(base[i])
            } else {
                maxBase = Math.max(maxBase, Math.abs(base[i]))
            }
            if (!maxHead) {
                maxHead = Math.abs(head[i])
            } else {
                maxHead = Math.max(maxHead, Math.abs(head[i]))
            }
        }
        if (maxBase === 0 || maxHead === 0) {
            return Number.MAX_VALUE
        }
        let sum = 0
        for (let i = 0; i < base.length; i++) {
            sum += Math.pow(base[i] / maxBase - head[i] / maxHead, 2)
        }
        return Math.sqrt(sum / base.length)
    }
})();
