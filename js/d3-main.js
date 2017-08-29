var fbase = new Firebase('https://d3-testbed.firebaseio.com/links-nodes');

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#6C2BBD", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(getLinkDistanceByLinktype).strength(.5))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));

    svg.firebase(fbase, {
    // How do we identify each data point?
    keyFunc : function(dataSnapshot) {
        // return {
        //    links : dataSnapshot.links,
        //     nodes: dataSnapshot.nodes
        // };
        return dataSnapshot
    },
    // When new data is added to the Firebase
    createFunc : function(newData) {
        var g = this.append('g'),
            locX = Math.random() * 600,
            locY = Math.random() * 500;
        // On new data, create a circle and a text element
        //  and add it to the d3 selection (this)
        g.append('circle')
            .attr('cx', locX)
            .attr('cy', locY)
            .attr('fill', '#cccccc')
            .attr('r', newData.val() * 5);
        g.append('text')
            .text(newData.name())
            .attr('text-anchor','middle')
            .attr('x', locX)
            .attr('y', locY)
            .attr("dy", ".31em");
        // layThemOut just arranges the circles so they fit
        layThemOut();
        return g;
    },
    // What to do when a data point has changed
    updateFunc : function(newData) {
        // Animate the object (this) to the new radius
        this.select('circle')
            .transition()
            .each("end", layThemOut)
            .attr('r',newData.val()*5);
    },
    // When a data point gets deleted
    deleteFunc : function(deletedData) {
        // Remove the d3 element (this)
        this.remove();
        layThemOut();
    }
});

/**
 * A function to lay out the bubbles, taken from D3 examples
 */
function layThemOut() {
    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
        .attr("stroke-width", function(d) { return Math.sqrt(d.value); });

    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("r", 15)
        .attr("fill", function(d) {
            var c = getColorForNode(d.group);//  color(d.group);
            return c;
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("title")
        .text(function(d) { return d.id; });

    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links);

    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    }
}
function getColorForNode(index) {
    return colors[index];
}

function getLinkDistanceByLinktype(item) {
    var type = item.type;

    if (type === "bad") {
        return 200;
    }
    else {
        return 100;
    }
}

function fade(opacity, showText) {
    return function (d, i) {
        var labels = [],
            selectedLabelData = null;
        node.style("fill-opacity", function (o) {
            var isNodeConnectedBool = isNodeConnected(d, o);
            var thisOpacity = isNodeConnectedBool ? 1 : opacity;
            if (!isNodeConnectedBool) {
                this.setAttribute('style', "stroke-opacity:" + opacity + ";fill-opacity:" + opacity + ";");
            } else {
                labels.push(o);
                if (o === d) selectedLabelData = o;
            }
            return thisOpacity;
        });

        link.style("stroke-opacity", function (o) {
            return o.source === d || o.target === d ? 1 : opacity;
        });

        labels.sort(function (a, b) {
            return b.value - a.value;
        });

        selectedLabelIndex = labels.indexOf(selectedLabelData);

//                    vis.selectAll("text.nodetext").data(labels).enter().append("svg:text")
//                        .attr("class", function(d){ return "nodetext name"+d.name;})
//                        .text(function(d){ return d.name;})
//                        .style("font-weight", function(o){ return d.index === o.index ? 'bold' : 'normal';})
//                        .attr("x", 0)
//                        .attr("y", function(d, i){ return this.getBBox().height * (i+1);});
    };
}

function normalizeNodesAndRemoveLabels() {
    return function (d, i) {
        selectedLabelIndex = null;
        node.style("fill-opacity", function (o) {
            this.setAttribute('style', "stroke-opacity:" + 1 + ";fill-opacity:" + 1 + ";");
        });

        link.style("stroke-opacity", function (o) {
            return 1;
        });
        vis.selectAll(".nodetext").remove();
    };
}

function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}
