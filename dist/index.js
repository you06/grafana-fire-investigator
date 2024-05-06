// ==UserScript==
// @name         Grafana Fire Investigator
// @version      2024-05-05
// @description  clew-searcher is a tool find the clews of unnormal metrics' root cause in the grafana.
// @author       you06
// @match        http://127.0.0.1:3000/
// @icon         https://blog2.tongmu.me/icon-96x96.png
// @grant        none
// ==/UserScript==
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
(function () {
    'use strict';
    var debugMode = true;
    var MAX_WAIT_SECONDS = 60;
    setInterval(function () {
        document.querySelectorAll('.grafana-app .dashboard-content .panel-wrapper').forEach(function (panel) {
            var header = panel.querySelector('.panel-header .panel-title-container');
            if (!header) {
                return;
            }
            if (header.querySelector('.clew-searcher-btn')) {
                return;
            }
            var panelId = parseInt(panel.parentNode.id.split('-')[1]);
            var title = panel.querySelector('.panel-title-text').innerHTML;
            var button = document.createElement('button');
            button.className = 'clew-searcher-btn';
            button.innerText = 'Search';
            var cssText = [
                'position: absolute; right: 0.5em; top: 0; cursor: pointer;',
                'color: #000'
            ].join('');
            button.style.cssText = cssText;
            header.appendChild(button);
            button.addEventListener('click', function (e) {
                e.stopPropagation();
                searcher.searchClew(e, panelId, title);
            });
        });
    }, 1000);
    var ClewSearcher = /** @class */ (function () {
        function ClewSearcher() {
            this.isRunning = false;
        }
        ClewSearcher.prototype.searchClew = function (e, panelId, title) {
            return __awaiter(this, void 0, void 0, function () {
                var timeRange, _a, from, to, dashboard, basePanelResult, id, panel, result, headPanalResults, rankedPanels, i;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (this.isRunning) {
                                return [2 /*return*/];
                            }
                            this.isRunning = true;
                            debug('click', panelId, title);
                            this.timeSrv = $(document).injector().get('timeSrv');
                            {
                                timeRange = this.timeSrv.timeRange();
                                _a = timeRange.raw, from = _a.from, to = _a.to;
                                if (from.toString().includes('now') || to.toString().includes('now')) {
                                    console.log('time range is not fixed, please fix it first');
                                    this.isRunning = false;
                                    return [2 /*return*/];
                                }
                            }
                            dashboard = this.timeSrv.dashboard;
                            for (id = 0; id < dashboard.panels.length; id++) {
                                if (dashboard.panels[id].title === title && dashboard.panels[id].id === panelId) {
                                    panel = dashboard.getPanelById(panelId);
                                    if (!panel.queryRunner) {
                                        console.log('this is not a query panel');
                                        return [2 /*return*/];
                                    }
                                    result = panel.queryRunner.getLastResult();
                                    basePanelResult = {
                                        panel: panel,
                                        result: result
                                    };
                                    break;
                                }
                            }
                            if (!basePanelResult) {
                                return [2 /*return*/];
                            }
                            debug('search clew of', title, basePanelResult);
                            return [4 /*yield*/, this.readAllMetrics(basePanelResult)];
                        case 1:
                            headPanalResults = _b.sent();
                            debug('metrics read done, check `window.headPanalResults` and `window.basePanelResult');
                            if (debugMode) {
                                window.headPanalResults = headPanalResults;
                                window.basePanelResult = basePanelResult;
                            }
                            debug('calculation distance start');
                            rankedPanels = rankMetrics(basePanelResult, headPanalResults, euclidean_distance_curve);
                            debug('calculation distance done');
                            for (i = 0; i < rankedPanels.length; i++) {
                                if (i >= 10) {
                                    break;
                                }
                                console.log("rank ".concat(i + 1, ", score: ").concat(rankedPanels[i].score, ", group: ").concat(this.groupMap[rankedPanels[i].panel.id], ", panel: ").concat(rankedPanels[i].panel.title, ", series: ").concat(rankedPanels[i].panel.title));
                            }
                            this.isRunning = false;
                            return [2 /*return*/];
                    }
                });
            });
        };
        ClewSearcher.prototype.readAllMetrics = function (basePanel) {
            return __awaiter(this, void 0, void 0, function () {
                var timeSrv, scrollView, scrollHeight, scrollTop, i, panelSeriesFutures, panelSeries;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            timeSrv = this.timeSrv;
                            timeSrv.dashboard.expandRows();
                            timeSrv.dashboard.startRefresh();
                            return [4 /*yield*/, sleep(1000)];
                        case 1:
                            _a.sent();
                            scrollView = document.querySelector('.dashboard-container .dashboard-scroll .scrollbar-view');
                            scrollHeight = scrollView.scrollHeight, scrollTop = scrollView.scrollTop;
                            scrollView.scrollTo(0, 0);
                            i = 0;
                            _a.label = 2;
                        case 2:
                            if (!(i < scrollHeight)) return [3 /*break*/, 5];
                            return [4 /*yield*/, sleep(10)];
                        case 3:
                            _a.sent();
                            scrollView.scrollTo(0, i);
                            _a.label = 4;
                        case 4:
                            i += 50;
                            return [3 /*break*/, 2];
                        case 5:
                            // TODO: back to current scroll position
                            scrollView.scrollTo(0, 0);
                            this.groupMap = panelsGroupMap(timeSrv.dashboard.panels);
                            panelSeriesFutures = timeSrv.dashboard.panels
                                .map(function (panel) { return __awaiter(_this, void 0, void 0, function () {
                                var i, result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!panel.queryRunner || panel.id === basePanel.panel.id || panel.type === 'row') {
                                                return [2 /*return*/, undefined];
                                            }
                                            i = 0;
                                            _a.label = 1;
                                        case 1:
                                            if (!(i < MAX_WAIT_SECONDS)) return [3 /*break*/, 5];
                                            result = panel.queryRunner.getLastResult();
                                            if (!!(checkTimeSeries(result) && compareTimeSeries(basePanel.result, result))) return [3 /*break*/, 3];
                                            return [4 /*yield*/, sleep(1000)];
                                        case 2:
                                            _a.sent();
                                            return [3 /*break*/, 4];
                                        case 3: return [2 /*return*/, {
                                                panel: panel,
                                                result: result
                                            }];
                                        case 4:
                                            i++;
                                            return [3 /*break*/, 1];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            return [4 /*yield*/, Promise.all(panelSeriesFutures)];
                        case 6:
                            panelSeries = _a.sent();
                            timeSrv.dashboard.collapseRows();
                            return [2 /*return*/, panelSeries.filter(function (series) { return series !== undefined; })];
                    }
                });
            });
        };
        return ClewSearcher;
    }());
    var searcher = new ClewSearcher();
    function extractTimeValues(series) {
        var timeField = series.fields.find(function (item) { return item.name === 'Time' && item.type === 'time'; });
        if (!timeField) {
            return null;
        }
        return timeField.values.buffer;
    }
    function extractQueryValues(series) {
        var queryField = series.fields.find(function (item) { return item.name === 'Value' && item.type === 'number'; });
        if (!queryField) {
            return null;
        }
        return queryField.values.buffer;
    }
    function checkTimeSeries(result) {
        if (result.series.length === 0) {
            return false;
        }
        var first = result.series[0];
        var firstTimeValues = extractTimeValues(first);
        if (!firstTimeValues) {
            return false;
        }
        for (var i = 1; i < result.series.length; i++) {
            var rest = result.series[i];
            var restTimeValues = extractTimeValues(rest);
            if (!restTimeValues) {
                return false;
            }
            for (var j = 0; j < firstTimeValues.length; j++) {
                if (firstTimeValues[j] !== restTimeValues[j]) {
                    return false;
                }
            }
        }
        return true;
    }
    function compareTimeSeries(baseResult, headResult) {
        var baseTimeValues = extractTimeValues(baseResult.series[0]);
        var headTimeValues = extractTimeValues(headResult.series[0]);
        if (!baseTimeValues || !headTimeValues) {
            return false;
        }
        if (baseTimeValues.length !== headTimeValues.length) {
            return false;
        }
        for (var i = 0; i < baseTimeValues.length; i++) {
            if (baseTimeValues[i] !== headTimeValues[i]) {
                return false;
            }
        }
        return true;
    }
    function rankMetrics(basePanelResult, headPanelResults, distanceCalculator) {
        var scoredResults = headPanelResults.map(function (headPanelResult) {
            var scoredResult = {
                panel: headPanelResult.panel,
                score: -1,
                lowestSeriesName: ''
            };
            for (var _i = 0, _a = headPanelResult.result.series; _i < _a.length; _i++) {
                var headSeries = _a[_i];
                for (var _b = 0, _c = basePanelResult.result.series; _b < _c.length; _b++) {
                    var baseSeries = _c[_b];
                    var headValues = extractQueryValues(headSeries);
                    var baseValues = extractQueryValues(baseSeries);
                    if (!headValues || !baseValues) {
                        continue;
                    }
                    var distance = distanceCalculator(baseValues, headValues);
                    if (scoredResult.score === -1 || distance < scoredResult.score) {
                        scoredResult.score = distance;
                        scoredResult.lowestSeriesName = headSeries.name;
                    }
                }
            }
            return scoredResult;
        }).filter(function (scoredResult) { return scoredResult.score !== -1; });
        scoredResults.sort(function (a, b) { return a.score - b.score; });
        return scoredResults;
    }
    function panelsGroupMap(panels) {
        var m = {};
        var groupName = '';
        for (var _i = 0, panels_1 = panels; _i < panels_1.length; _i++) {
            var panel = panels_1[_i];
            if (panel.type === 'row') {
                groupName = panel.title;
                continue;
            }
            m[panel.id] = groupName;
        }
        return m;
    }
    function debug() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (debugMode) {
            console.log.apply(console, __spreadArray(['[DEBUG]', new Date().toTimeString()], args, false));
        }
    }
    function sleep(ms) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, ms); })];
            });
        });
    }
    function euclidean_distance_curve(base, head) {
        var maxBase, maxHead;
        for (var i = 0; i < base.length; i++) {
            if (!maxBase) {
                maxBase = Math.abs(base[i]);
            }
            else {
                maxBase = Math.max(maxBase, Math.abs(base[i]));
            }
            if (!maxHead) {
                maxHead = Math.abs(head[i]);
            }
            else {
                maxHead = Math.max(maxHead, Math.abs(head[i]));
            }
        }
        if (maxBase === 0 || maxHead === 0) {
            return Number.MAX_VALUE;
        }
        var sum = 0;
        for (var i = 0; i < base.length; i++) {
            sum += Math.pow(base[i] / maxBase - head[i] / maxHead, 2);
        }
        return Math.sqrt(sum / base.length);
    }
})();
//# sourceMappingURL=index.js.map