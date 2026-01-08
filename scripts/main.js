(function () {
    'use strict';

    function get(selector, scope = document) {
        return scope.querySelector(selector);
    }

    function getAll(selector, scope = document) {
        return scope.querySelectorAll(selector);
    }

    // uses dygraphs library <http://dygraphs.com/>
    function initGraphs() {
        const config = {
            locale: 'en-US',
            dateOptions: { day: 'numeric', month: 'long', year: 'numeric' },
            gridColor: 'hsl(210, 0%, 40%)',
            axes: {
                x: {
                    drawAxis: false,
                    drawGrid: false
                },
                y: {
                    drawAxis: true,
                    includeZero: true,
                    pixelsPerLabel: 40,
                    axisLineColor: 'transparent',
                    axisLabelWidth: 0,
                }
            }
        };
        const touchInteractionModel = {
            touchmove: (event) => {
                const coords = event.touches[0];
                const simulation = new MouseEvent('mousemove', {
                    clientX: coords.clientX,
                    clientY: coords.clientY
                });

                event.preventDefault();
                event.target.dispatchEvent(simulation);
            }
        };
        const legendFormatter = (data, units) => {
            if (!data.x) return '';

            const date = new Date(data.xHTML).toLocaleString(config.locale, config.dateOptions);
            const count = data.series[0].yHTML.average;

            return `<div class="graph-legend-date">${date}</div>` +
                   `<div class="graph-legend-count">${units}: ${count}</div>`;
        };
        const annotationMouseOverHandler = (annotation) => {
            annotation.div.classList.remove('tooltip-hidden');
            annotation.div.style.zIndex = '100';
        };
        const annotationMouseOutHandler = (annotation) => {
            annotation.div.classList.add('tooltip-hidden');
            annotation.div.style.removeProperty('z-index');
        };

        function basicGraphConfig(containerSelector, units, lineColor) {
            return {
                color: lineColor,
                width: 700,
                height: 300,
                strokeWidth: 3,
                axes: config.axes,
                axisLineColor: config.gridColor,
                gridLineColor: config.gridColor,
                gridLineWidth: 1,
                highlightCircleSize: 5,
                labelsKMB: true,
                labelsDiv: get(`${containerSelector} .graph-legend`),
                rollPeriod: 7,
                fillGraph: true,
                legendFormatter: (data) => legendFormatter(data, units),
                interactionModel: touchInteractionModel,
                annotationMouseOverHandler: (annotation) => annotationMouseOverHandler(annotation),
                annotationMouseOutHandler: (annotation) => annotationMouseOutHandler(annotation),
            };
        }

        function appendXAxisLabels(containerSelector) {
            const xAxisLabels = get(`${containerSelector} .graph-x-labels`);

            for (let i = 0; i < 12; i++) {
                const month = new Date(2021, i).toLocaleString(config.locale, { month: 'short' });
                const labelNode = document.createElement('div');
                const shortLabel = document.createElement('span');
                const longLabel = document.createElement('span');

                labelNode.classList.add('x-label');
                longLabel.classList.add('long-month');
                longLabel.textContent = month;
                shortLabel.classList.add('short-month');
                shortLabel.textContent = month.substring(0, 1);

                labelNode.appendChild(shortLabel);
                labelNode.appendChild(longLabel);
                xAxisLabels.appendChild(labelNode);
            }
        }

        function createValueFormatter(locale) {
            return function(num, opts, series, graph, row, col) {
                const currentValue = graph.getValue(row, col);

                return {
                    actual: currentValue.toLocaleString(locale),
                    average: Math.round(num).toLocaleString(locale),
                };
            };
        }

        function createAnnotations(seriesName, annotations) {
            // set basic properties for all annotations
            return annotations.map((annotation, i) => {
                return {
                    ...annotation,
                    series: seriesName, // must match column name in CSV
                    shortText: i + 1,
                    width: 24,
                    height: 24,
                    cssClass: `tooltip-hidden annotation-${i + 1}`,
                    tickWidth: 2,
                    tickHeight: annotation.tickHeight || 20
                };
            });
        }

        function createTooltip(date, text) {
            const tooltip = document.createElement('div');
            const titleNode = document.createElement('div');
            const textNode = document.createElement('div');

            titleNode.classList.add('tooltip-title');
            titleNode.textContent = new Date(date).toLocaleString(config.locale, config.dateOptions);
            textNode.textContent = text;

            tooltip.classList.add('tooltip');
            tooltip.appendChild(titleNode);
            tooltip.appendChild(textNode);

            return tooltip;
        }

        function appendTooltips(containerSelector, annotations) {
            // insert tooltip inside its respective annotation, replacing hover title text
            annotations.forEach((annotation, i) => {
                const tooltip = createTooltip(annotation.x, annotation.text);
                const annotationEl = get(`${containerSelector} .annotation-${i + 1}`);

                if (annotationEl && !annotationEl.contains(get('.tooltip', annotationEl))) {
                    annotationEl.appendChild(tooltip);
                    annotationEl.removeAttribute('title');
                }

                // check if tooltip overflows viewport
                if (tooltip) {
                    const rect = tooltip.getBoundingClientRect();

                    if (rect.right > window.innerWidth) {
                        tooltip.classList.add('tooltip-overflow-right');
                    } else if (rect.left < 0) {
                        tooltip.classList.add('tooltip-overflow-left');
                    }
                }
            });
        }

        // =================
        //      TRAFFIC
        // =================

        const trafficAnnotations = createAnnotations('Pageviews', [
            { x: "2025/03/22", text: "Minecraft LIVE – March is held", tickHeight: 70 },
            { x: "2025/03/25", text: "Spring to Life is released", tickHeight: 70 },
            { x: "2025/06/17", text: "Chase the Skies is released" },
            { x: "2025/09/27", text: "Minecraft LIVE – September is held", tickHeight: 50 },
            { x: "2025/12/09", text: "Mounts of Mayhem is released" },
        ]);
        const trafficGraphConfig = (containerSelector, yAxisRange, annotations, lineColor) => {
            return {
                ...basicGraphConfig(containerSelector, 'Views', lineColor),
                drawCallback: (dygraph, isInitial) => {
                    if (isInitial) {
                        dygraph.setAnnotations(annotations);
                        appendXAxisLabels(containerSelector);
                    }

                    appendTooltips(containerSelector, annotations);
                },
                axes: {
                    ...config.axes,
                    y: {
                        ...config.axes.y,
                        valueRange: [0, yAxisRange],
                        valueFormatter: createValueFormatter(config.locale)
                    }
                }
            }
        };

        const traffic = new Dygraph(
            get('.traffic .graph'),
            './data/traffic.csv',
            trafficGraphConfig('.traffic', 1600000, trafficAnnotations, 'hsl(109, 42%, 59%)')
        );

        // =================
        //       EDITS
        // =================

        const editsAnnotations = createAnnotations('Edits', [
            //
        ]);
        const editsGraphConfig = (containerSelector, lineColor) => {
            return {
                ...basicGraphConfig(containerSelector, 'Edits', lineColor),
                drawCallback: (dygraph, isInitial) => {
                    if (isInitial) {
                        dygraph.setAnnotations(editsAnnotations);
                        appendXAxisLabels(containerSelector);
                    }

                    appendTooltips(containerSelector, editsAnnotations);
                },
                axes: {
                    ...config.axes,
                    y: {
                        ...config.axes.y,
                        valueRange: [0, 4100],
                        valueFormatter: createValueFormatter(config.locale)
                    }
                }
            }
        };

        const edits = new Dygraph(
            get('.edits .graph'),
            './data/edits.csv',
            editsGraphConfig('.edits', 'hsl(109, 42%, 59%)')
        );
    }

    initGraphs();
}());
