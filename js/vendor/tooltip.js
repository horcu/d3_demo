d3.selection.prototype.tooltip = function(o, f) {
    var body, clipped, clipper, d, defaults, height, holder, optionsList, parent, positions, sets, voronois, width;
    if (arguments.length < 2) {
        f = o;
    }
    body = d3.select('body');
    defaults = {
        type: "tooltip",
        text: "You need to pass in a string for the text value",
        title: "Title value",
        content: "Content examples",
        detection: "shape",
        placement: "fixed",
        gravity: "right",
        position: [100, 100],
        displacement: [0, 0],
        mousemove: false
    };
    optionsList = [];
    voronois = [];
    this.each(function(d, i) {
        var opt;
        opt = f.apply(this, arguments);
        optionsList.push(opt);
        if (opt.detection === 'voronoi') {
            return voronois.push([opt, i]);
        }
    });
    if (voronois.length !== 0) {
        parent = d3.select(this[0][0].ownerSVGElement);
        holder = parent.append("g").attr("id", "__clip__holder__");
        console.log(voronois);
        positions = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = voronois.length; _i < _len; _i++) {
                d = voronois[_i];
                _results.push(d[0].position);
            }
            return _results;
        })();
        console.log(positions);
        sets = d3.geom.voronoi(positions);
        height = parent.attr("height");
        width = parent.attr("width");
        clipper = d3.geom.polygon([[0, 0], [0, height], [width, height], [width, 0]]).clip;
        clipped = positions.map(clipper);
        holder.append("g").attr("id", "clipPaths").selectAll("clipPath").data(voronois).enter().append("clipPath").attr("id", function(d, i) {
            return "clip-" + i;
        }).append("circle").attr("cx", function(d) {
            return d[0].position[0];
        }).attr("cy", function(d) {
            return d[0].position[1];
        }).attr("r", function(d) {
            return 20;
        });
        holder.append("g").attr("id", "clipped").selectAll("path").data(voronois).enter().append("path").attr("d", function(d, i) {
            return "M" + (clipped[i].join('L')) + "Z";
        }).attr("clip-path", function(d, i) {
            return "url(#clip-" + i + ")";
        });
    }
    return this.each(function(d, i) {
        var el, move_tip, options, tip, htimer, tip_state;
        options = optionsList[i];
        el = d3.select(this);
        move_tip = function(selection) {
            var center, offsets;
            center = [0, 0];
            if (options.placement === "mouse") {
                center = d3.mouse(body.node());
            } else {
                offsets = this.ownerSVGElement.getBoundingClientRect();
                center[0] = offsets.left;
                center[1] = offsets.top;
                center[0] += options.position[0];
                center[1] += options.position[1];
                center[0] += window.scrollX;
                center[1] += window.scrollY;
            }
            center[0] += options.displacement[0];
            center[1] += options.displacement[1];
            return selection.style("left", "" + center[0] + "px").style("top", "" + center[1] + "px").style("display", "block");
        };
        el.on("mouseover", function() {
            var inner;
            console.log("mouseover", this, arguments, options, el, tip, tip_state);
            tip_state |= 1;
            if (tip) {
                console.log("***** TIP already built ***** ", this, arguments, options, el, tip, tip_state);
                // update tooltip texts?
                if (options.type === "tooltip") {
                    tip.select(".tooltip-inner").html(options.text);
                }
                if (options.type === "popover") {
                    inner = tip.select(".popover-inner");
                    inner.select(".popover-title").text(options.title);
                    inner.select(".popover-content").select("p").remove();
                    inner.select(".popover-content").append("p").html(options.content[0][0].outerHTML);
                }
            } else {
                tip = body.append("div").classed(options.type, true).classed(options.gravity, true).classed('fade', true).style("display", "none");
                if (options.type === "tooltip") {
                    tip.append("div").html(options.text).attr("class", "tooltip-inner");
                }
                if (options.type === "popover") {
                    inner = tip.append("div").attr("class", "popover-inner");
                    inner.append("h3").text(options.title).attr("class", "popover-title");
                    inner.append("div").attr("class", "popover-content").append("p").html(options.content[0][0].outerHTML);
                }
                tip.append("div").attr("class", "arrow");
                tip.on("mouseenter", function() {
                    console.log("TT.mouseenter", this, arguments, options, el, tip_state);
                    tip_state |= 2;
                }).on("mouseleave", function() {
                    console.log("TT.mouseleave ******** ", this, arguments, options, el, tip_state);
                    tip_state &= ~2;
                    console.log("TT.mouseleave ******** ", this, arguments, options, el, tip_state);
                });
            }
            if (htimer) clearTimeout(htimer);
            /* htimer = */ setTimeout(function() {
                if (tip && (tip_state & 1))
                    tip.classed('in', true);
            }, 10);
            return tip.style("display", "").call(move_tip.bind(this));
        });
        if (options.mousemove) {
            el.on("mousemove", function() {
                console.log("mousemove", this, arguments, options, el);
                return tip.call(move_tip.bind(this));
            });
        }
        return el.on("mouseout", function() {
            var tip_remover;
            console.log("mouseout", this, arguments, options, el, tip);
            tip_remover = function() {
                console.log("tip_remover", this, arguments, options, el, tip, tip_state);
                if (tip && (tip_state & 1) && !(tip_state & 2)) {
                    tip_state = 0;
                    tip.classed('in', false);
                    setTimeout(function() {
                        if (tip)
                            tip.remove();
                        tip = null;
                    }, 500);
                } else {
                    if (htimer) clearTimeout(htimer);
                    htimer = setTimeout(tip_remover, 150);
                }
            };
            if (htimer) clearTimeout(htimer);
            htimer = setTimeout(tip_remover, 150);
        });
    });
};
