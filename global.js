const dataPath = "data/f01.csv";
let data = [];
let interval;
let isPlaying = false;
let currentIndex = 0;

const width = 800, height = 500, padding = 50;
const animationDuration = 5000; // 5 seconds for full animation

const svg = d3.select("#scatterPlot")
    .attr("width", width)
    .attr("height", height);

const xScale = d3.scaleLinear().range([padding, width - padding]);
const yScale = d3.scaleLinear().range([height - padding, padding]);

// Load CSV data
d3.csv(dataPath).then(csvData => {
    data = csvData.map(d => ({
        subject_id: d.subject_id,
        session_type: d.session_type,
        timestamp: new Date(d.timestamp),
        ibi: +d.ibi,
        amplitude: +d.amplitude
    }));

    const subjects = [...new Set(data.map(d => d.subject_id))];
    const subjectSelect = document.getElementById("subjectSelect");
    subjects.forEach(subject => {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
    });

    updatePlot(subjectSelect.value, document.getElementById("sessionSelect").value);

    subjectSelect.addEventListener("change", () => {
        resetAnimation();
        updatePlot(subjectSelect.value, document.getElementById("sessionSelect").value);
    });

    document.getElementById("sessionSelect").addEventListener("change", () => {
        resetAnimation();
        updatePlot(subjectSelect.value, document.getElementById("sessionSelect").value);
    });

    document.getElementById("playPauseBtn").addEventListener("click", toggleAnimation);
});

// Update scatter plot based on subject and session type
function updatePlot(subject, session) {
    const filteredData = data
        .filter(d => d.subject_id === subject && d.session_type === session)
        .sort((a, b) => a.timestamp - b.timestamp);

    if (filteredData.length === 0) {
        svg.html("<text x='50%' y='50%' text-anchor='middle'>No data available.</text>");
        return;
    }

    xScale.domain(d3.extent(filteredData, d => d.ibi));
    yScale.domain(d3.extent(filteredData, d => d.amplitude));

    svg.selectAll("*").remove();

    svg.append("g")
        .attr("transform", `translate(0, ${height - padding})`)
        .call(d3.axisBottom(xScale))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .text("Interbeat Interval (IBI)");

    svg.append("g")
        .attr("transform", `translate(${padding}, 0)`)
        .call(d3.axisLeft(yScale))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .text("Amplitude");

    svg.selectAll("circle")
        .data(filteredData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.ibi))
        .attr("cy", d => yScale(d.amplitude))
        .attr("r", 5)
        .attr("fill", "steelblue")
        .attr("opacity", 0.6)
        .append("title")
        .text(d => `Time: ${d.timestamp}\nIBI: ${d.ibi}\nAmplitude: ${d.amplitude}`);
}

function toggleAnimation() {
    isPlaying = !isPlaying;
    document.getElementById("playPauseBtn").textContent = isPlaying ? "Pause" : "Play";

    if (isPlaying) {
        animatePlot();
    } else {
        resetAnimation();
    }
}

function resetAnimation() {
    clearInterval(interval);
    isPlaying = false;
    currentIndex = 0;
    document.getElementById("playPauseBtn").textContent = "Play";
}

function animatePlot() {
    const subject = document.getElementById("subjectSelect").value;
    const session = document.getElementById("sessionSelect").value;

    const filteredData = data
        .filter(d => d.subject_id === subject && d.session_type === session)
        .sort((a, b) => a.timestamp - b.timestamp);

    if (filteredData.length === 0) return;

    const totalPoints = filteredData.length;
    const intervalTime = animationDuration / totalPoints;

    interval = setInterval(() => {
        if (currentIndex >= totalPoints) {
            resetAnimation();
            return;
        }

        const currentData = filteredData.slice(0, currentIndex + 1);

        svg.selectAll("circle")
            .data(currentData)
            .join("circle")
            .attr("cx", d => xScale(d.ibi))
            .attr("cy", d => yScale(d.amplitude))
            .attr("r", 5)
            .attr("fill", (d, i) => i === currentData.length - 1 ? "orange" : "steelblue")
            .attr("opacity", (d, i) => i === currentData.length - 1 ? 1 : 0.5);

        currentIndex++;
    }, intervalTime);
}
