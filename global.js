function scrollToSlide(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener("DOMContentLoaded", function() {
    const slides = document.querySelectorAll(".slide");

    // Slide-in effect
    const handleScroll = () => {
        slides.forEach(slide => {
            const slideTop = slide.getBoundingClientRect().top;
            if (slideTop < window.innerHeight * 0.75) {
                slide.classList.add("visible");
            }
        });
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    // Load demographic data from the CSV
    d3.csv("demographic_dx.csv").then(function(data) {
        // Parse data
        data = data.map(d => ({
            age: +d.age,
            sex: d.sex.trim()
        }));

        // Set up dimensions
        const margin = { top: 50, right: 100, bottom: 70, left: 70 };
        const vis = document.getElementById("admission-vis");
        const width = vis.clientWidth - margin.left - margin.right;
        const height = vis.clientHeight - margin.top - margin.bottom;

        const svg = d3.select("#admission-vis")
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Binning data
        const binWidth = 10;
        const ageMin = d3.min(data, d => d.age);
        const ageMax = d3.max(data, d => d.age);
        const bins = d3.bin()
            .domain([ageMin, ageMax])
            .thresholds(d3.range(Math.floor(ageMin / binWidth) * binWidth, Math.ceil(ageMax / binWidth) * binWidth, binWidth))
            (data.map(d => d.age));

        // Count males & females per bin
        bins.forEach(bin => {
            bin.maleCount = data.filter(d => d.age >= bin.x0 && d.age < bin.x1 && d.sex === "0").length;
            bin.femaleCount = data.filter(d => d.age >= bin.x0 && d.age < bin.x1 && d.sex === "1").length;
        });

        // Scales
        const x0 = d3.scaleBand()
            .domain(bins.map(d => `${d.x0}-${d.x1}`))
            .range([0, width])
            .padding(0.2);

        const x1 = d3.scaleBand()
            .domain(["male", "female"])
            .range([0, x0.bandwidth()])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => Math.max(d.maleCount, d.femaleCount))])
            .nice()
            .range([height, 0]);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x0).tickSize(0))
            .selectAll("text").style("font-weight", "bold");

        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text").style("font-weight", "bold");

        // Axis labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Age Bins");

        svg.append("text")
            .attr("x", -height / 2)
            .attr("y", -50)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .attr("transform", "rotate(-90)")
            .text("Count");

        // Tooltip
        const tooltip = d3.select("body").append("div").attr("class", "tooltip");

        // Bars
        const barGroups = svg.selectAll(".bar-group")
            .data(bins)
            .enter()
            .append("g")
            .attr("class", "bar-group")
            .attr("transform", d => `translate(${x0(`${d.x0}-${d.x1}`)},0)`);

        // Male bars
        barGroups.append("rect")
            .attr("x", d => x1("male"))
            .attr("y", d => y(d.maleCount))
            .attr("width", x1.bandwidth())
            .attr("height", d => height - y(d.maleCount))
            .attr("fill", "#74c0fc")
            .on("mouseover", (e, d) => {
                d3.select(e.target).attr("fill", "#3b8dd1");
                tooltip.style("opacity", 1).html(`
                    <strong>Male</strong><br>
                    Age Bin: ${d.x0}-${d.x1}<br>
                    Count: ${d.maleCount}
                `);
            })
            .on("mousemove", e => {
                tooltip.style("left", `${e.pageX + 10}px`).style("top", `${e.pageY - 20}px`);
            })
            .on("mouseout", (e) => {
                d3.select(e.target).attr("fill", "#74c0fc");
                tooltip.style("opacity", 0);
            });

        // Female bars
        barGroups.append("rect")
            .attr("x", d => x1("female"))
            .attr("y", d => y(d.femaleCount))
            .attr("width", x1.bandwidth())
            .attr("height", d => height - y(d.femaleCount))
            .attr("fill", "#f783ac")
            .on("mouseover", (e, d) => {
                d3.select(e.target).attr("fill", "#d94876");
                tooltip.style("opacity", 1).html(`
                    <strong>Female</strong><br>
                    Age Bin: ${d.x0}-${d.x1}<br>
                    Count: ${d.femaleCount}
                `);
            })
            .on("mousemove", e => {
                tooltip.style("left", `${e.pageX + 10}px`).style("top", `${e.pageY - 20}px`);
            })
            .on("mouseout", (e) => {
                d3.select(e.target).attr("fill", "#f783ac");
                tooltip.style("opacity", 0);
            });
    });
    }).catch(function(error) {
        console.error("Error loading the CSV file:", error);
    });

