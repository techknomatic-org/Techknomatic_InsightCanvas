// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

export function shouldAutoFocusGeneratedChart(userChartFocusLocked: boolean): boolean {
    return !userChartFocusLocked;
}
