dc.barChart = function (parent, chartGroup) {
    var MIN_BAR_WIDTH = 1;
    var DEFAULT_GAP_BETWEEN_BARS = 2;
    var DEFAULT_GAP_WITHIN_GROUP = 2;

    var _chart = dc.stackableChart(dc.coordinateGridChart({}));

    var _gap = DEFAULT_GAP_BETWEEN_BARS;
    var _groupGap = DEFAULT_GAP_WITHIN_GROUP;
    var _centerBar = false;
    
    var _mode = dc.barChart.modes.stack;

    var _numberOfBars;
    var _barWidth;

    _chart.resetBarProperties = function () {
        _numberOfBars = null;
        _barWidth = null;
        _groupWidth = null;
        getNumberOfBars();
        barWidth();
    }

    _chart.plotData = function () {
        var groups = _chart.allGroups();

        _chart.calculateDataPointMatrixWithinXDomain(groups);

        for (var groupIndex = 0; groupIndex < groups.length; ++groupIndex) {
            generateBarsPerGroup(groupIndex, groups[groupIndex]);
        }
    };

    function generateBarsPerGroup(groupIndex, group) {
        var data = _chart.getDataWithinXDomain(group);

        calculateBarWidth(_chart.x()(_chart.keyAccessor()(data.length === 0 ? 0 : data[0])));

        var bars = _chart.chartBodyG().selectAll("rect." + dc.constants.STACK_CLASS + groupIndex)
            .data(data);

        addNewBars(bars, groupIndex);

        updateBars(bars, groupIndex);

        deleteBars(bars);
    }

    function groupGap() {
      return _mode === dc.barChart.modes.stack ? _barGap : _groupGap;
    }
    
    function calculateBarWidth(offset) {
        if (_barWidth == null) {
            var numberOfBars = _chart.isOrdinal() ? getNumberOfBars() + 1 : getNumberOfBars();

            var w = Math.floor((_chart.xAxisLength() - offset - (numberOfBars - 1) * _gap) / numberOfBars);

            if (isNaN(w) || w < MIN_BAR_WIDTH) {
                w = MIN_BAR_WIDTH;
            }
            
            _groupWidth = w;
            
            switch (_mode) {
            case dc.barChart.modes.stack:
              _barWidth = _groupWidth;
              break;
            case dc.barChart.modes.side_by_side:
              var numGroups = _chart.allGroups().length;
              _barWidth = (_groupWidth - (numGroups - 1) * _groupGap) / numGroups;
            }
        }
    }

    function addNewBars(bars, groupIndex) {
        var bars = bars.enter().append("rect");

        bars.attr("class", "bar " + dc.constants.STACK_CLASS + groupIndex)
            .attr("x", function (data, dataIndex) {
                return barX(this, data, groupIndex, dataIndex);
            })
            .attr("y", _chart.baseLineY())
            .attr("width", barWidth);

        if (_chart.isOrdinal())
            bars.on("click", _chart.onClick);

        if (_chart.renderTitle()) {
            bars.append("title").text(_chart.title());
        }

        dc.transition(bars, _chart.transitionDuration())
            .attr("y", function (data, dataIndex) {
                return barY(this, data, dataIndex);
            })
            .attr("height", function (data) {
                return _chart.dataPointHeight(data, getGroupIndexFromBar(this));
            });
    }

    function updateBars(bars, groupIndex) {
        if (_chart.renderTitle()) {
            bars.select("title").text(_chart.title());
        }

        dc.transition(bars, _chart.transitionDuration())
            .attr("x", function (data) {
                return barX(this, data, groupIndex);
            })
            .attr("y", function (data, dataIndex) {
                return barY(this, data, dataIndex);
            })
            .attr("height", function (data) {
                return _chart.dataPointHeight(data, getGroupIndexFromBar(this));
            })
            .attr("width", barWidth);
    }

    function deleteBars(bars) {
        dc.transition(bars.exit(), _chart.transitionDuration())
            .attr("y", _chart.xAxisY())
            .attr("height", 0);
    }

    function getNumberOfBars() {
        if (_numberOfBars == null) {
            _numberOfBars = _chart.xUnitCount();
        }

        return _numberOfBars;
    }

    function barWidth(d) {
        return _barWidth;
    }

    function setGroupIndexToBar(bar, groupIndex) {
        bar[dc.constants.GROUP_INDEX_NAME] = groupIndex;
    }

    function barX(bar, data, groupIndex) {
        setGroupIndexToBar(bar, groupIndex);
        var
          x = _chart.x()(_chart.keyAccessor()(data)) + _chart.margins().left,
          groupX = _centerBar ? x - _groupWidth / 2 : x;
        
        return _mode === dc.barChart.modes.side_by_side
          ? groupX + (barWidth() + _groupGap) * groupIndex
          : groupX;
    }

    function getGroupIndexFromBar(bar) {
        return bar[dc.constants.GROUP_INDEX_NAME];
    }

    function barY(bar, data, dataIndex) {
        var groupIndex = getGroupIndexFromBar(bar);
        return _mode === dc.barChart.modes.stack
          ? _chart.getChartStack().getDataPoint(groupIndex, dataIndex)
          : _chart.baseLineY() - _chart.dataPointHeight(data, groupIndex) + _chart.margins().top;
    }

    _chart.fadeDeselectedArea = function () {
        var bars = _chart.chartBodyG().selectAll("rect.bar");
        var extent = _chart.brush().extent();

        if (_chart.isOrdinal()) {
            if (_chart.hasFilter()) {
                bars.classed(dc.constants.SELECTED_CLASS, function (d) {
                    return _chart.hasFilter(_chart.keyAccessor()(d));
                });
                bars.classed(dc.constants.DESELECTED_CLASS, function (d) {
                    return !_chart.hasFilter(_chart.keyAccessor()(d));
                });
            } else {
                bars.classed(dc.constants.SELECTED_CLASS, false);
                bars.classed(dc.constants.DESELECTED_CLASS, false);
            }
        } else {
            if (!_chart.brushIsEmpty(extent)) {
                var start = extent[0];
                var end = extent[1];

                bars.classed(dc.constants.DESELECTED_CLASS, function (d) {
                    var xValue = _chart.keyAccessor()(d);
                    return xValue < start || xValue >= end;
                });
            } else {
                bars.classed(dc.constants.DESELECTED_CLASS, false);
            }
        }
    };

    _chart.centerBar = function (_) {
        if (!arguments.length) return _centerBar;
        _centerBar = _;
        return _chart;
    };

    _chart.gap = function (_) {
        if (!arguments.length) return _gap;
        _gap = _;
        return _chart;
    };

    _chart.mode = function(_) {
      if (!arguments.length) return _mode;
      _mode = _;
      return _chart;
    }

    _chart.extendBrush = function () {
        var extent = _chart.brush().extent();
        if (_chart.round() && !_centerBar) {
            extent[0] = extent.map(_chart.round())[0];
            extent[1] = extent.map(_chart.round())[1];

            _chart.chartBodyG().select(".brush")
                .call(_chart.brush().extent(extent));
        }
        return extent;
    };

    dc.override(_chart, "prepareOrdinalXAxis", function () {
        return this._prepareOrdinalXAxis(_chart.xUnitCount() + 1);
    });
    
    dc.override(_chart, "yAxisMax", function() {
      if (_mode === dc.barChart.modes.stack) {
        return this._yAxisMax();
      }
      else {
        var max = d3.max(_chart.allGroups(), function(group, groupIndex) {
          return dc.utils.groupMax(group, _chart.getValueAccessorByIndex(groupIndex));
        });

        max = dc.utils.add(max, _chart.yAxisPadding());

        return max;
      }
    });

    return _chart.anchor(parent, chartGroup);
};

dc.barChart.modes = { stack: 0, side_by_side: 1 };
