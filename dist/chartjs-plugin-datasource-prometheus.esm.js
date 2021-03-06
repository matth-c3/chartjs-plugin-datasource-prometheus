import 'chart.js';
import PrometheusQuery from 'prometheus-query';

// Min step is 1s
const PROMETHEUS_QUERY_RANGE_MIN_STEP = 1;

var datasource = {

    /**
     * Compute a step for range_query (interval between 2 points in second)
     * Min step: 1s
     * Default: 1 step every 25px
     * @param {Date} start 
     * @param {Date} end
     * @param {number} chartWidth: width in pixel 
     */
    getPrometheusStepAuto: (start, end, chartWidth) => {
        const secondDuration = (end.getTime() - start.getTime()) / 1000;
        const step = Math.floor(secondDuration / chartWidth) * 25;
        return step < PROMETHEUS_QUERY_RANGE_MIN_STEP ? PROMETHEUS_QUERY_RANGE_MIN_STEP : step;
    },

    /**
     * Return Date objects containing the start and end date of interval.
     * Relative dates are computed to absolute
     * @param {object} timeRange 
     */
    getStartAndEndDates(timeRange) {
        // default to "absolute"
        timeRange['type'] = !!timeRange['type'] ? timeRange['type'] : 'absolute';

        if (timeRange['type'] === 'absolute') {
            return {
                start: timeRange['start'],
                end: timeRange['end']
            };
        } else if (timeRange['type'] === 'relative') {
            return {
                start: new Date(new Date().getTime() + timeRange['start']),
                end: new Date(new Date().getTime() + timeRange['end']),
            };
        }
        throw new Error('Unexpected options.timeRange value.');
    }

};

// Min step is 1s

var opt = {

    /**
     * Compute a step for range_query (interval between 2 points in second)
     */
    assertPluginOptions: (options) => {
        if (!options)
            throw 'ChartDatasourcePrometheusPlugin.options is undefined';

        if (!options['query'])
            throw new Error('options.query is undefined');
        if (!options['timeRange'])
            throw new Error('options.timeRange is undefined');
        if (options['timeRange']['start'] == null)
            throw new Error('options.timeRange.start is undefined');
        if (options['timeRange']['end'] == null)
            throw new Error('options.timeRange.end is undefined');

        if (typeof (options['query']) != 'string')
            throw new Error('options.query must be a string');

        if (typeof (options['timeRange']) != 'object')
            throw new Error('options.timeRange must be a object');
        if (typeof (options['timeRange']['type']) != 'string')
            throw new Error('options.timeRange.type must be a string');
        if (!(typeof (options['timeRange']['start']) == 'number' || (typeof (options['timeRange']['start']) == 'object' && options['timeRange']['start'].constructor.name == 'Date')))
            throw new Error('options.timeRange.start must be a Date object (absolute) or integer (relative)');
        if (!(typeof (options['timeRange']['end']) == 'number' || (typeof (options['timeRange']['end']) == 'object' && options['timeRange']['end'].constructor.name == 'Date')))
            throw new Error('options.timeRange.end must be a Date object (absolute) or integer (relative)');
        if (typeof (options['timeRange']['msUpdateInterval']) != 'number')
            throw new Error('options.timeRange.msUpdateInterval must be a integer');
        if (options['timeRange']['msUpdateInterval'] < 1000)
            throw new Error('options.timeRange.msUpdateInterval must be greater than 1s.');
    },

    defaultOptionsValues: (options) => {
        const dEfault = {
            // https://learnui.design/tools/data-color-picker.html#palette
            'backgroundColor': [
                'transparent',
                'transparent',
                'transparent',
                'transparent',
                'transparent',
                'transparent',
                'transparent',
                'transparent',

                // 'rgba(0, 63, 92, 0.2)',
                // 'rgba(47, 75, 124, 0.2)',
                // 'rgba(102, 81, 145, 0.2)',
                // 'rgba(160, 81, 149, 0.2)',
                // 'rgba(212, 80, 135, 0.2)',
                // 'rgba(249, 93, 106, 0.2)',
                // 'rgba(255, 124, 67, 0.2)',
                // 'rgba(255, 166, 0, 0.2)',

                // 'rgba(255, 99, 132, 0.2)',
                // 'rgba(54, 162, 235, 0.2)',
                // 'rgba(255, 206, 86, 0.2)',
                // 'rgba(75, 192, 192, 0.2)',
                // 'rgba(153, 102, 255, 0.2)',
                // 'rgba(255, 159, 64, 0.2)'
            ],
            'borderColor': [
                // 'rgba(0, 63, 92, 1)',
                // 'rgba(47, 75, 124, 1)',
                // 'rgba(102, 81, 145, 1)',
                // 'rgba(160, 81, 149, 1)',
                // 'rgba(212, 80, 135, 1)',
                // 'rgba(249, 93, 106, 1)',
                // 'rgba(255, 124, 67, 1)',
                // 'rgba(255, 166, 0, 1)',

                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            'borderWidth': 3,
        };

        return Object.assign(dEfault, options);
    }

};

// const AXES_UNIT_AND_STEP = [{

// enforce xAxes data type to 'time'
const setTimeAxesOptions = (chart, start, end) => {
    chart.config.options = !!chart.config.options ? chart.config.options : {};
    chart.config.options.scales = !!chart.config.options.scales ? chart.config.options.scales : {};
    chart.config.options.scales.xAxes = !!chart.config.options.scales.xAxes && chart.config.options.scales.xAxes.length > 0 ? chart.config.options.scales.xAxes : [{}];
    chart.config.options.scales.xAxes[0].time = !!chart.config.options.scales.xAxes[0].time ? chart.config.options.scales.xAxes[0].time : {};
    chart.config.options.scales.xAxes[0].time.displayFormats = !!chart.config.options.scales.xAxes[0].time.displayFormats ? chart.config.options.scales.xAxes[0].time.displayFormats : {};

    // const w = chart.width;
    // const msInterval = (end.getTime() - start.getTime());
    // const msPerPixel = msInterval / w;

    // for (let i = 0; i < AXES_UNIT_AND_STEP.length && AXES_UNIT_AND_STEP[i]['minMsPerPixel'] * AXES_UNIT_AND_STEP[i]['stepSize'] < msPerPixel; i++) {
    //     chart.config.options.scales.xAxes[0].time.unit = AXES_UNIT_AND_STEP[i]['unit'];
    //     chart.config.options.scales.xAxes[0].time.stepSize = AXES_UNIT_AND_STEP[i]['stepSize'];
    // }

    chart.config.options.scales.xAxes[0].type = 'time';
    chart.config.options.scales.xAxes[0].distribution = 'linear';
    // chart.config.options.scales.xAxes[0].time.stepSize = PIXEL_STEP_SIZE; // pixels between 2 vertical grid lines
    chart.config.options.scales.xAxes[0].time.minUnit = 'millisecond';
    chart.config.options.scales.xAxes[0].time.displayFormats.hour = 'MMM D, hA'; // override default momentjs format for 'hour' time unit
};

var ChartDatasourcePrometheusPlugin = {
    id: 'datasource-prometheus',

    beforeInit: (chart) => {
        chart['datasource-prometheus'] = {
            'loading': false,
        };
    },

    afterInit: (chart, options) => {
        opt.assertPluginOptions(options); // triggers exceptions

        // auto update
        if (!!options && !!options['timeRange'] && !!options['timeRange']['msUpdateInterval'])
            chart['datasource-prometheus']['updateInterval'] = setInterval(() => {
                chart.update();
            }, options['timeRange']['msUpdateInterval']);
    },

    beforeUpdate: (chart, options) => {
        const _options = opt.defaultOptionsValues(options);

        if (!!chart['datasource-prometheus'] && chart['datasource-prometheus']['loading'] == true)
            return true;

        const prometheus = _options['prometheus'];
        const query = _options['query'];
        const {
            start,
            end
        } = datasource.getStartAndEndDates(_options['timeRange']);
        const step = datasource.getPrometheusStepAuto(start, end, chart.width);

        const pq = new PrometheusQuery(prometheus);

        pq.rangeQuery(query, start, end, step)
            .then((res) => {
                if (res.result.length > 0) {
                    chart.data.datasets = res.result.map((serie, i) => {
                        return {
                            label: serie.metric.toString(),
                            data: serie.values.map((v, j) => {
                                return {
                                    t: v.time,
                                    y: v.value,
                                };
                            }),
                            backgroundColor: _options.backgroundColor[i % _options.backgroundColor.length],
                            borderColor: _options.borderColor[i % _options.borderColor.length],
                            borderWidth: _options.borderWidth,
                        };
                    });

                }

                setTimeAxesOptions(chart);

                chart['datasource-prometheus']['loading'] = true;
                chart.update();
                chart['datasource-prometheus']['loading'] = false;
            });

        return false;
    },

    destroy: (chart, options) => {
        // auto update
        if (!!chart['datasource-prometheus']['updateInterval'])
            clearInterval(chart['datasource-prometheus']['updateInterval']);
    },

    constructors: {},
    extensions: {},

    register: (type, constructor, extensions) => {},

    getType: (url) => {},

    getConstructor: (type) => {}
};

export default ChartDatasourcePrometheusPlugin;
