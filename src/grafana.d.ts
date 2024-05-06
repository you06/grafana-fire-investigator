declare class TimeSrv {
    dashboard: Dashboard
    timeRange(): TimeRange
}

declare class TimeRange {
    raw: {
        from: {
            toString(): string
        }
        to: {
            toString(): string
        }
    }
}

declare class Dashboard {
    panels: Panel[]
    getPanelById(id: number): Panel
    expandRows(): void
    collapseRows(): void
    startRefresh(): void
}

declare class Panel {
    id: number
    type: string
    title: string
    queryRunner: QueryRunner
}

declare class QueryRunner {
    getLastResult(): Result
}

declare class Result {
    series: Series[]
}

declare class Series {
    name: string
    fields: Field[]
}

declare class Field {
    name: string
    type: string
    values: {
        buffer: number[]
    }
}

