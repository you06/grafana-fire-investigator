declare class PanelResult {
    panel: Panel
    result: Result
}

declare class ScoredPanel {
    panel: Panel
    score: number
    lowestSeriesName: string
}

type DistanceCalculator = (base: number[], head: number[]) => number
