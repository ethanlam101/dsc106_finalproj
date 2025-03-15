let x, y, bins, svg, height, width, x1, bars, admissionTimeout, diagnosesTimeout;
let svgDiagnoses, dots, dxData;
let currentDiagnosisIndex = 0;

let hasAnimatedAdmissions = false;
let hasAnimatedDiagnoses = false;

const colorScale = d3.scaleOrdinal(d3.schemeSet1); 

// Add tooltip div (hidden by default)
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("border-radius", "8px")
    .style("padding", "8px")
    .style("font-size", "12px")
    .style("box-shadow", "0px 4px 8px rgba(0, 0, 0, 0.2)")
    .style("opacity", 0);

// Function to show tooltips on hover
function addBarTooltips() {
    bars.on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <strong>Range:</strong> ${d.x0} - ${d.x1}<br>
                <strong>Male Count:</strong> ${d.maleCount}<br>
                <strong>Female Count:</strong> ${d.femaleCount}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            tooltip.transition().duration(200).style("opacity", 0);
        });
}

// Scroll to a specific slide
function scrollToSlide(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// Animate bars into gender-grouped bars
function animateGraphToGender() {
    x1 = d3.scaleBand()
        .domain(["male", "female"])
        .range([0, x.bandwidth()])
        .padding(0.1);

    y.domain([0, d3.max(bins, d => Math.max(d.maleCount, d.femaleCount))]);

    bars.transition()
        .duration(1000)
        .attr("width", x1.bandwidth())
        .attr("x", d => x(`${d.x0}-${d.x1}`) + x1("male"))
        .attr("y", d => y(d.maleCount))
        .attr("height", d => height - y(d.maleCount))
        .attr("fill", "#74c0fc");

    svg.selectAll(".female-bar")
        .data(bins)
        .join("rect")
        .attr("class", "female-bar")
        .attr("x", d => x(`${d.x0}-${d.x1}`) + x1("female"))
        .attr("y", height)
        .attr("width", x1.bandwidth())
        .attr("fill", "#f783ac")
        .transition()
        .duration(1000)
        .attr("y", d => y(d.femaleCount))
        .attr("height", d => height - y(d.femaleCount));

    // Add legend (moved to the right)
    svg.append("circle").attr("cx", width - 70).attr("cy", -10).attr("r", 8).style("fill", "#74c0fc");
    svg.append("text").attr("x", width - 50).attr("y", -5).text("Male").style("font-size", "14px").style("font-weight", "bold");

    svg.append("circle").attr("cx", width - 70).attr("cy", 20).attr("r", 8).style("fill", "#f783ac");
    svg.append("text").attr("x", width - 50).attr("y", 25).text("Female").style("font-size", "14px").style("font-weight", "bold");

    document.getElementById('gender-insight').classList.add('visible');

    // Add tooltips to the new bars
    addBarTooltips();
    // Add trend lines for both genders
    addTrendLines();

    setTimeout(() => {
        document.getElementById('scroll-admission').classList.add('visible');
    }, 2000);
}

function addTrendLines() {
    const xLinear = d3.scaleLinear()
        .domain([d3.min(bins, d => (d.x0 + d.x1) / 2), d3.max(bins, d => (d.x0 + d.x1) / 2)])
        .range([0, width]);

    const maleTrendData = bins.map(bin => ({ x: (bin.x0 + bin.x1) / 2, y: bin.maleCount }));
    const femaleTrendData = bins.map(bin => ({ x: (bin.x0 + bin.x1) / 2, y: bin.femaleCount }));

    const lineMale = d3.line()
        .x(d => xLinear(d.x))
        .y(d => y(d.y));

    const lineFemale = d3.line()
        .x(d => xLinear(d.x))
        .y(d => y(d.y));

    // Create trend lines but make them invisible at first
    const maleLine = svg.append("path")
        .data([maleTrendData])
        .attr("class", "male-trend-line")
        .attr("d", lineMale)
        .attr("fill", "none")
        .attr("stroke", "#3a76a6")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", function() {
            return this.getTotalLength();
        })
        .attr("stroke-dashoffset", function() {
            return this.getTotalLength();
        });

    const femaleLine = svg.append("path")
        .data([femaleTrendData])
        .attr("class", "female-trend-line")
        .attr("d", lineFemale)
        .attr("fill", "none")
        .attr("stroke", "#b55e7d")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", function() {
            return this.getTotalLength();
        })
        .attr("stroke-dashoffset", function() {
            return this.getTotalLength();
        });

    // Animate the lines after a 1-second delay
    setTimeout(() => {
        maleLine.transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

        femaleLine.transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);
    }, 1000);
}

function drawAdmissionGraph() {
    // Load demographic data from CSV
    d3.csv("demographic_dx.csv").then(function(data) {
        data = data.map(d => ({
            age: +d.age,
            sex: d.sex.trim()
        }));

        const margin = { top: 50, right: 100, bottom: 70, left: 70 };
        const vis = document.getElementById("admission-vis");
        width = vis.clientWidth - margin.left - margin.right;
        height = vis.clientHeight - margin.top - margin.bottom;

        svg = d3.select("#admission-vis")
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const binWidth = 10;
        const ageMin = d3.min(data, d => d.age);
        const ageMax = d3.max(data, d => d.age);
        bins = d3.bin()
            .domain([ageMin, ageMax])
            .thresholds(d3.range(Math.floor(ageMin / binWidth) * binWidth, Math.ceil(ageMax / binWidth) * binWidth, binWidth))
            (data.map(d => d.age));

        bins.forEach(bin => {
            bin.maleCount = data.filter(d => d.age >= bin.x0 && d.age < bin.x1 && d.sex === "0").length;
            bin.femaleCount = data.filter(d => d.age >= bin.x0 && d.age < bin.x1 && d.sex === "1").length;
            bin.totalCount = bin.maleCount + bin.femaleCount;
        });

        x = d3.scaleBand()
            .domain(bins.map(d => `${d.x0}-${d.x1}`))
            .range([0, width])
            .padding(0.2);

        y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.totalCount)])
            .nice()
            .range([height, 0]);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickSize(0))
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

        // Initial bars (total counts)
        bars = svg.selectAll(".bar")
            .data(bins)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(`${d.x0}-${d.x1}`))
            .attr("y", d => y(d.totalCount))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.totalCount))
            .attr("fill", "#74c0fc");
    }).catch(function(error) {
        console.error("Error loading the CSV file:", error);
    });
}

// Draw Diagnoses visualization
function drawDiagnosesGraph() {
    d3.csv("dx_group_counts.csv").then(function(data) {
        // Process the data
        dxData = data.map(d => ({
            dx_group: d.dx_group.trim(),
            emop: +d.emop,
            count: Math.ceil(+d.count / 5) // 1 dot represents 5 people
        }));

        if (dxData.length === 0) {
            console.error("dxData is empty or not loaded properly.");
            return;
        }

        // Flatten the data for dot placement
        const flattenedData = [];
        dxData.forEach(d => {
            for (let i = 0; i < d.count; i++) {
                flattenedData.push(d);
            }
        });

        // Set up SVG dimensions
        const margin = { top: 40, right: 50, bottom: 10, left: 50 }; // Increased left margin for labels
        const width = 800 - margin.left - margin.right;
        const height = 1000 - margin.top - margin.bottom;

        svgDiagnoses = d3.select("#diagnoses-vis")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Calculate dot positions
        const totalDots = flattenedData.length;
        const columns = Math.ceil(Math.sqrt(totalDots));
        const rows = Math.ceil(totalDots / columns);

        const dotSpacingX = (width / columns) - 0.5;
        const dotSpacingY = (height / rows) - 11;

        const diagnosesTooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("border", "1px solid #ccc")
            .style("border-radius", "8px")
            .style("padding", "8px")
            .style("font-size", "12px")
            .style("box-shadow", "0px 4px 8px rgba(0, 0, 0, 0.2)")
            .style("opacity", 0);

        // Draw dots
        dots = svgDiagnoses.selectAll(".dot")
            .data(flattenedData)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", (d, i) => {
                const colIndex = i % columns;
                return colIndex * dotSpacingX + (dotSpacingX / 2);
            })
            .attr("cy", (d, i) => {
                const rowIndex = Math.floor(i / columns);
                return rowIndex * dotSpacingY + (dotSpacingY / 2);
            })
            .attr("r", 5)
            .attr("fill", "#7d7d7d") // Start all dots in gray
            .attr("opacity", 0.7)
            .on("mouseover", function (event, d) {
                // Show tooltip on mouseover
                diagnosesTooltip.transition().duration(200).style("opacity", 1);
                diagnosesTooltip.html(`
                    <strong>Diagnosis:</strong> ${d.dx_group}<br>
                    <strong>Emergency Case:</strong> ${d.emop === 1 ? "Yes" : "No"}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", function (event) {
                // Move tooltip with the mouse
                diagnosesTooltip.style("left", (event.pageX + 10) + "px")
                                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                // Hide tooltip on mouseout
                diagnosesTooltip.transition().duration(200).style("opacity", 0);
            })

    }).catch(function(error) {
        console.error("Error loading the CSV file:", error);
    });
}

// Animate dots when user reaches the diagnoses slide
function animateDiagnosesGraph() {
    const groups = Array.from(new Set(dots.data().map(d => d.dx_group))); // Get unique groups
    const totalDuration = groups.length * 1000;

    groups.forEach((group, index) => {
        setTimeout(() => {
            // Highlight dots by group
            svgDiagnoses.selectAll(".dot")
                .filter(d => d.dx_group === group)
                .transition()
                .duration(1000)
                .style("opacity", 1)
                .attr("fill", colorScale(group));

            document.getElementById(group).classList.add('visible');
        }, index * 500); // 2 seconds between groups
    });
    
    setTimeout(() => {
        const scrollElement = document.getElementById('scroll2');
        if (scrollElement) {
            scrollElement.classList.add('visible');
        } else {
            console.warn('Element with id "scroll" not found.');
        }
    }, 2000);
}

function emergencyDiagnosesGraph() {
    // Hide the "Click to Continue" button
    document.getElementById('scroll2').classList.remove('visible');

    // Get unique groups
    const groups = Array.from(new Set(dots.data().map(d => d.dx_group)));

    // Create an array of promises for each group's animation
    const groupPromises = groups.map((group, index) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const groupElement = document.getElementById(group);
                    if (groupElement) {
                        groupElement.classList.remove('visible');
                        console.log(`Hidden group: ${group}`);
                    } else {
                        console.warn(`Element with id "${group}" not found.`);
                    }
                    resolve(); // Resolve the promise
                } catch (error) {
                    console.error(`Error hiding group ${group}:`, error);
                    resolve(); // Ensure the promise resolves even if there's an error
                }
            }, index * 500); // 1 second between groups
        });
    });

    // Wait for all group animations to finish
    Promise.all(groupPromises)
        .then(() => {
            console.log("All groups hidden. Resetting dots and showing emergency text.");

            // Hide the diagnoses container
            const diagnosesContainer = document.getElementById('diagnoses-container');
            diagnosesContainer.classList.add('hidden');

            // Show the emergency text container
            const emergencyContainer = document.getElementById('emergency-text-container');
            emergencyContainer.classList.remove('hidden');
            emergencyContainer.classList.add('visible');

            // Reset all dots to gray
            svgDiagnoses.selectAll(".dot")
                .transition()
                .duration(1000)
                .attr("fill", "#7d7d7d");

            // Highlight emergency surgery dots (emop=1)
            svgDiagnoses.selectAll(".dot")
                .filter(d => d.emop === 1)
                .transition()
                .duration(1000)
                .attr("fill", "red"); // Use red for emergency surgeries

            // Show emergency text
            const emergencyText = document.getElementById('Emergency');
            if (emergencyText) {
                emergencyText.classList.remove('hidden');
                emergencyText.classList.add('visible');
                console.log("Emergency text shown.");
            } else {
                console.warn('Element with id "Emergency" not found.');
            }

            const emergencyText2 = document.getElementById('Emergency-2');
            if (emergencyText2) {
                emergencyText2.classList.remove('hidden');
                emergencyText2.classList.add('visible');
                console.log("Emergency text 2 shown.");
            } else {
                console.warn('Element with id "Emergency-2" not found.');
            }

            // Delay showing emergency text 3 and highlighting Renal and Urinary Disorders dots
            setTimeout(() => {
                // Show emergency text 3
                const emergencyText3 = document.getElementById('Emergency-3');
                if (emergencyText3) {
                    emergencyText3.classList.remove('hidden');
                    emergencyText3.classList.add('visible');
                    console.log("Emergency text 3 shown.");
                } else {
                    console.warn('Element with id "Emergency-3" not found.');
                }

                // Turn all dots gray
                svgDiagnoses.selectAll(".dot")
                    .transition()
                    .duration(1000)
                    .attr("fill", "#7d7d7d");

                // Highlight Renal and Urinary Disorders dots
                svgDiagnoses.selectAll(".dot")
                    .filter(d => d.dx_group === 'Renal and Urinary Disorders')
                    .transition()
                    .duration(1000)
                    .attr("fill", "blue") // Use blue for Renal and Urinary Disorders
                    .filter(d => d.emop === 1)
                    .transition()
                    .duration(1000)
                    .attr("fill", "red"); // Use red for emergency surgeries
            }, 2000); // Delay of 2 seconds after emergency text 1 and 2 are shown

            setTimeout(() => {
                const emergencyText4 = document.getElementById('Emergency-4');
                emergencyText4.classList.remove('hidden');
                emergencyText4.classList.add('visible');
            }, 2000);

            setTimeout(() => {
                document.getElementById('scroll-diagnoses').classList.remove('hidden');
                document.getElementById('scroll-diagnoses').classList.add('visible');
            }, 2000);

        })
        .catch((error) => {
            console.error("Error in Promise.all:", error);
        });
}  

function drawBarChart() {
    d3.csv("blood_loss_by_approach.csv").then(function (data) {
        // Process the data
        const processedData = d3.groups(data, d => d.optype).map(([optype, values]) => {
            const totalCount = d3.sum(values, d => +d.count);
            const openCount = values.find(d => d.approach === "Open")?.count || 0;
            const roboticCount = values.find(d => d.approach === "Robotic")?.count || 0;
            const videoscopicCount = values.find(d => d.approach === "Videoscopic")?.count || 0;

            return {
                optype,
                totalCount,
                openProportion: totalCount > 0 ? openCount / totalCount : 0, // Avoid division by zero
                roboticProportion: totalCount > 0 ? roboticCount / totalCount : 0,
                videoscopicProportion: totalCount > 0 ? videoscopicCount / totalCount : 0,
                openMean: values.find(d => d.approach === "Open")?.mean || 0,
                roboticMean: values.find(d => d.approach === "Robotic")?.mean || 0,
                videoscopicMean: values.find(d => d.approach === "Videoscopic")?.mean || 0,
            };
        });

        console.log("Processed Data:", processedData); // Debugging

        const margin = { top: 50, right: 50, bottom: 70, left: 70 };
        const width = 800 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        const svg = d3.select("#surgical-approach-vis")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom + 10)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // X-axis scale
        const x = d3.scaleBand()
            .domain(processedData.map(d => d.optype)) // Use processedData
            .range([0, width])
            .padding(0.2);

        // Y-axis scale
        const y = d3.scaleLinear()
            .domain([0, d3.max(processedData, d => d.totalCount)]) // Use processedData
            .nice()
            .range([height, 0]);

        // X-axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.15em")
            .attr("transform", "rotate(-45)");

        // Y-axis
        svg.append("g")
            .call(d3.axisLeft(y));

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 75)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Surgery Type");

        svg.append("text")
            .attr("x", -height / 2)
            .attr("y", -50)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .attr("transform", "rotate(-90)")
            .text("Count");

        // Draw initial bars
        const bars = svg.selectAll(".bar")
            .data(processedData) // Use processedData
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.optype))
            .attr("y", d => y(d.totalCount))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.totalCount))
            .attr("fill", "#74c0fc");

        // Add tooltips
        bars.on("mouseover", function (event, d) {
                const tooltip = d3.select("#tooltip");
                tooltip.transition().duration(200).style("opacity", 1);
                tooltip.html(`
                    <strong>Operation Type:</strong> ${d.optype}<br>
                    <strong>Total Count:</strong> ${d.totalCount}<br>
                    <strong>Open Mean Blood Loss:</strong> ${d.openMean.toFixed(2)}<br>
                    <strong>Robotic Mean Blood Loss:</strong> ${d.roboticMean.toFixed(2)}<br>
                    <strong>Videoscopic Mean Blood Loss:</strong> ${d.videoscopicMean.toFixed(2)}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", function (event) {
                const tooltip = d3.select("#tooltip");
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                const tooltip = d3.select("#tooltip");
                tooltip.transition().duration(200).style("opacity", 0);
            });

        // Animate the bars to show proportions
        setTimeout(() => {
            animateBars(bars, processedData, x, y, height); // Use processedData
        }, 3000);

    }).catch(function (error) {
        console.error("Error loading the CSV file:", error);
    });
}

function animateBars(bars, data, x, y, height) {
    bars.each(function (d, i) {
        const bar = d3.select(this);

        // Ensure proportions are valid numbers
        const openProportion = d.openProportion || 0;
        const roboticProportion = d.roboticProportion || 0;
        const videoscopicProportion = d.videoscopicProportion || 0;

        // Calculate heights
        const openHeight = height - y(d.totalCount * openProportion);
        const roboticHeight = height - y(d.totalCount * roboticProportion);
        const videoscopicHeight = height - y(d.totalCount * videoscopicProportion);

        // Log values for debugging
        console.log(`Bar ${i}:`, {
            optype: d.optype,
            openProportion,
            roboticProportion,
            videoscopicProportion,
            openHeight,
            roboticHeight,
            videoscopicHeight,
        });

        // Animate the bar segments
        bar.transition()
            .duration(1000)
            .attr("y", y(d.totalCount * openProportion))
            .attr("height", openHeight)
            .attr("fill", "#74c0fc"); // Color for Open

        bar.append("rect")
            .attr("x", x(d.optype))
            .attr("y", y(d.totalCount * openProportion))
            .attr("width", x.bandwidth())
            .attr("height", roboticHeight)
            .attr("fill", "#f783ac") // Color for Robotic
            .transition()
            .duration(1000)
            .attr("y", y(d.totalCount * (openProportion + roboticProportion)));

        bar.append("rect")
            .attr("x", x(d.optype))
            .attr("y", y(d.totalCount * (openProportion + roboticProportion)))
            .attr("width", x.bandwidth())
            .attr("height", videoscopicHeight)
            .attr("fill", "#63e6be") // Color for Videoscopic
            .transition()
            .duration(1000)
            .attr("y", y(d.totalCount * (openProportion + roboticProportion + videoscopicProportion)));
    });
}

document.addEventListener("DOMContentLoaded", function() {
    const slides = document.querySelectorAll(".slide");
    const admissionSlide = document.getElementById('admission');
    const diagnosesSlide = document.getElementById('diagnoses');
    

    // Slide-in effect
    const handleScroll = () => {
        slides.forEach(slide => {
            const slideTop = slide.getBoundingClientRect().top;
            if (slideTop < window.innerHeight * 0.75) {
                slide.classList.add("visible");
            }
        });

        // Trigger admissions animation
        const admissionTop = admissionSlide.getBoundingClientRect().top;
        if (admissionTop < window.innerHeight * 0.75 && !hasAnimatedAdmissions) {
            hasAnimatedAdmissions = true;
            admissionTimeout = setTimeout(animateGraphToGender, 1000);
        }

        // Trigger diagnoses animation
        const diagnosesTop = diagnosesSlide.getBoundingClientRect().top;
        if (diagnosesTop < window.innerHeight * 0.75 && !hasAnimatedDiagnoses) {
            hasAnimatedDiagnoses = true;
            diagnosesTimeout = setTimeout(animateDiagnosesGraph, 1000);
        }

    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    drawAdmissionGraph();
    drawDiagnosesGraph();
    drawBarChart();
});
