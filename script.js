const canvas_time = document.getElementById('timeDomain');
const ctx_time = canvas_time.getContext('2d');

const canvas_frequency = document.getElementById('freqDomain');
const ctx_frequency = canvas_frequency.getContext('2d');

const FFT_RES = 16384 * 2

let fft = new FFT(16384 * 2); // Must be a power of 2

const entry_field = document.getElementById('textbox_function')

let startX, startY;
let dragging_time = false;
let dragging_freq = false;

let cameraX_TIME = 300;
let cameraY_TIME = 250;
let prevCameraX_TIME = cameraX_TIME;
let prevCameraY_TIME = cameraY_TIME;

let cameraX_FREQUENCY = 0;
let cameraY_FREQUENCY = 250;
let prevCameraX_FREQUENCY = cameraX_FREQUENCY;
let prevCameraY_FREQUENCY = cameraY_FREQUENCY;

const CWIDTH = canvas_time.clientWidth;
const CHEIGHT = canvas_time.clientHeight;

const DENOMINATIONS_X = 10;
const DENOMINATIONS_Y = 10;

const UNITS_PER_CELL_X = 1; // each cell = 1 unit on x-axis
const UNITS_PER_CELL_Y = 1; // each cell = 1 unit on y-axis

const PIXELS_PER_CELL_X = CWIDTH / DENOMINATIONS_X;
const PIXELS_PER_CELL_Y = CHEIGHT / DENOMINATIONS_Y;

const PIXELS_PER_UNIT_X = PIXELS_PER_CELL_X / UNITS_PER_CELL_X;
const PIXELS_PER_UNIT_Y = PIXELS_PER_CELL_Y / UNITS_PER_CELL_Y;

const INCREMENT = 0.001;

let function_to_draw;
let function_buffer;

let freq_buffer;

const namedValues = {
    "sin": 'Math.sin',
    "cos": 'Math.cos',
    "log": 'Math.log',
    "tan": 'Math.tan',
    "e": 'Math.exp',
    '(\\d)(\\D)': `$1*$2`, // handle implicit multiplication
}

const handleTextReplacement = (inputText) => {
    output = inputText;
    for (let key in namedValues) {
        const regex = new RegExp(key, 'g');
        console.log(output.replace(regex, namedValues[key]));
        output = output.replaceAll(regex, namedValues[key]);
    }

    console.log(`Output = ${output}`);

    return output;
}

const drawLine = (x, y, x_end, y_end, colour, thickness = 1, ctx = ctx_time) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x_end, y_end);
    ctx.lineWidth = thickness;
    ctx.strokeStyle = colour;
    ctx.stroke();
}

const convertCartesianToCanvasCoords = (x, y) => {
    // Convert coordinate units to pixel offset, then apply camera
    return {
        'x': cameraX_TIME + (x * PIXELS_PER_UNIT_X),
        'y': cameraY_TIME - (y * PIXELS_PER_UNIT_Y)  // note: minus because canvas y is inverted
    };
}

const convertCartesianToCanvasCoordsFreq = (x, y) => {
    // Convert coordinate units to pixel offset, then apply camera
    return {
        'x': cameraX_FREQUENCY + (x * PIXELS_PER_UNIT_X),
        'y': cameraY_FREQUENCY - (y * PIXELS_PER_UNIT_Y)  // note: minus because canvas y is inverted
    };
}

const convertCanvasToCartesianCoords = (screenX, screenY) => {
    return {
        'x': (screenX - cameraX_TIME) / PIXELS_PER_UNIT_X,
        'y': -(screenY - cameraY_TIME) / PIXELS_PER_UNIT_Y  // inverted
    };
}

const convertCanvasToCartesianCoordsFreq = (screenX, screenY) => {
    return {
        'x': (screenX - cameraX_FREQUENCY) / PIXELS_PER_UNIT_X,
        'y': -(screenY - cameraY_FREQUENCY) / PIXELS_PER_UNIT_Y  // inverted
    };
}

const getMinAndMaxX = () => {
    const leastX = convertCanvasToCartesianCoords(0, 0);
    const mostX = convertCanvasToCartesianCoords(599, 0);

    return { 'minX': leastX.x, 'maxX': mostX.x };
}

const drawCircle = (x, y, radius, colour, ctx = ctx_time) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = colour;
    ctx.fill();
}

const redrawGridWithCamera = () => {
    ctx_time.clearRect(0, 0, CWIDTH, CHEIGHT);

    const distance_between_denoms_x = CWIDTH / DENOMINATIONS_X;
    const distance_between_denoms_y = CHEIGHT / DENOMINATIONS_Y;


    const startGridX = Math.floor(-cameraX_TIME / distance_between_denoms_x);
    const startGridY = Math.floor(-cameraY_TIME / distance_between_denoms_y);

    for (let i = startGridX; i <= startGridX + DENOMINATIONS_X + 1; i++) {
        const x_val = i * distance_between_denoms_x + cameraX_TIME;
        if (x_val >= 0 && x_val <= CWIDTH) {
            const colour = (i === 0) ? 'black' : 'blue'
            const thickness = (i === 0) ? 2 : 1;
            drawLine(x_val, 0, x_val, CHEIGHT, colour, thickness);
        }
    }

    for (let i = startGridY; i <= startGridY + DENOMINATIONS_Y + 1; i++) {
        const y_val = i * distance_between_denoms_y + cameraY_TIME;
        if (y_val >= 0 && y_val <= CHEIGHT) {
            const colour = (i === 0) ? 'black' : 'blue';
            const thickness = (i === 0) ? 2 : 1;
            drawLine(0, y_val, CWIDTH, y_val, colour, thickness);
        }
    }
}

const redrawGridWithCameraFreq = () => {
    ctx_frequency.clearRect(0, 0, CWIDTH, CHEIGHT);

    const distance_between_denoms_x = CWIDTH / DENOMINATIONS_X;
    const distance_between_denoms_y = CHEIGHT / DENOMINATIONS_Y;


    const startGridX = Math.floor(-cameraX_FREQUENCY / distance_between_denoms_x);
    const startGridY = Math.floor(-cameraY_FREQUENCY / distance_between_denoms_y);

    for (let i = startGridX; i <= startGridX + DENOMINATIONS_X + 1; i++) {
        const x_val = i * distance_between_denoms_x + cameraX_FREQUENCY;
        if (x_val >= 0 && x_val <= CWIDTH) {
            const colour = (i === 0) ? 'black' : 'blue'
            const thickness = (i === 0) ? 2 : 1;
            drawLine(x_val, 0, x_val, CHEIGHT, colour, thickness, ctx_frequency);
        }
    }

    for (let i = startGridY; i <= startGridY + DENOMINATIONS_Y + 1; i++) {
        const y_val = i * distance_between_denoms_y + cameraY_FREQUENCY;
        if (y_val >= 0 && y_val <= CHEIGHT) {
            const colour = (i === 0) ? 'black' : 'blue';
            const thickness = (i === 0) ? 2 : 1;
            drawLine(0, y_val, CWIDTH, y_val, colour, thickness, ctx_frequency);
        }
    }
}

const handleMouseDown = (event) => {
    dragging_time = true;
    startX = event.clientX;
    startY = event.clientY;

    prevCameraX_TIME = cameraX_TIME;
    prevCameraY_TIME = cameraY_TIME;
}

const handleMouseUp = () => {
    dragging_time = false;
}

const handleMouseDownFreq = (event) => {
    dragging_freq = true;
    startX = event.clientX;
    startY = event.clientY;

    prevCameraX_FREQUENCY = cameraX_FREQUENCY;
    prevCameraY_FREQUENCY = cameraY_FREQUENCY;
}

const handleMouseUpFreq = () => {
    dragging_freq = false;
}

const drawFunction = () => {
    if (!function_buffer) { return }
    for (let i = 0; i < function_buffer.length - 1; i++) {
        coordinates = function_buffer[i];
        const nextCoords = function_buffer[i + 1];
        const canvasCoords = convertCartesianToCanvasCoords(coordinates.x, coordinates.y);
        const canvasCoordsNext = convertCartesianToCanvasCoords(nextCoords.x, nextCoords.y);

        drawLine(canvasCoords.x, canvasCoords.y, canvasCoordsNext.x, canvasCoordsNext.y, 'red', 2, ctx_time);
        // drawCircle(canvasCoords.x, canvasCoords.y, 1, 'red');
    }
}

const drawGridAndOrigin = () => {
    redrawGridWithCamera();
    tryFillGlobalBuffer();
    drawFunction();
}

const tryFillGlobalBufferFreq = () => {
    try {
        if (!function_buffer || function_buffer.length === 0) return;

        const FFT_SIZE = 16384; // Match your FFT size

        // Extract just the y-values
        const samples = function_buffer.map(point => point.y);

        // Always use exactly FFT_SIZE samples
        const trimmedSamples = samples.slice(0, FFT_SIZE);

        // Pad with zeros if we don't have enough samples
        while (trimmedSamples.length < FFT_SIZE) {
            trimmedSamples.push(0);
        }

        // Convert to complex array
        const input = fft.toComplexArray(trimmedSamples);

        // Create output buffer
        freq_buffer = fft.createComplexArray();

        // Perform FFT
        fft.realTransform(freq_buffer, input);

    } catch (e) {
        console.log(e);
    }
}

const drawFunctionFFT = () => {
    if (!freq_buffer) { return; }

    const numBins = freq_buffer.length / 2;
    const halfBins = numBins / 2;

    for (let i = 0; i < halfBins - 1; i++) {
        const realIndex = i * 2;
        const imagIndex = i * 2 + 1;

        const real = freq_buffer[realIndex];
        const imag = freq_buffer[imagIndex];

        const realNext = freq_buffer[realIndex + 2];
        const imagNext = freq_buffer[imagIndex + 2];

        // Calculate magnitude and normalize
        const magnitude = 10 * Math.sqrt(real * real + imag * imag) / fft.size;
        const magnitudeNext = 10 * Math.sqrt(realNext * realNext + imagNext * imagNext) / fft.size;

        // Scale frequency to be closer together
        const frequency = i * 0.1; // Scale down the frequency spacing
        const nextFreq = (i + 1) * 0.1;

        const canvas_coords = convertCartesianToCanvasCoordsFreq(frequency, magnitude);
        const canvas_coords2 = convertCartesianToCanvasCoordsFreq(nextFreq, magnitudeNext);

        // drawCircle(canvas_coords.x, canvas_coords.y, 2, 'red', ctx_frequency);
        drawLine(canvas_coords.x, canvas_coords.y, canvas_coords2.x, canvas_coords2.y, 'red', 2, ctx_frequency);
    }
}

const drawGridAndOriginFreq = () => {
    redrawGridWithCameraFreq();
    tryFillGlobalBufferFreq();
    drawFunctionFFT();
}

const handleMouseMove = (event) => {
    if (dragging_time) {
        cameraX_TIME = prevCameraX_TIME + event.clientX - startX;
        cameraY_TIME = prevCameraY_TIME + event.clientY - startY;
        drawGridAndOrigin();
    }
}

const handleMouseMoveFreq = (event) => {
    if (dragging_freq) {
        cameraX_FREQUENCY = prevCameraX_FREQUENCY + event.clientX - startX;
        cameraY_FREQUENCY = prevCameraY_FREQUENCY + event.clientY - startY;
        drawGridAndOriginFreq();
    }
}

const tryFillGlobalBuffer = () => {
    try {
        const arr = [];
        const x_vals = getMinAndMaxX();
        for (let i = x_vals.minX; i < x_vals.maxX; i += INCREMENT) {
            const res = function_to_draw(i);
            arr.push({ 'x': i, 'y': res });
        }
        // if all that completes successfully, change global buffer
        function_buffer = arr;
    }
    catch (e) {
        console.log(e)
    }
}

const handleFunction = (event) => {
    const f = new Function('x', 'return ' + handleTextReplacement(entry_field.value));
    function_to_draw = f;

    drawGridAndOrigin();
    drawGridAndOriginFreq();
}

handleFunction();

canvas_time.addEventListener('mousedown', handleMouseDown);
canvas_time.addEventListener('mouseup', handleMouseUp);
canvas_time.addEventListener('mousemove', handleMouseMove);
entry_field.addEventListener('input', handleFunction);

canvas_frequency.addEventListener('mousedown', handleMouseDownFreq);
canvas_frequency.addEventListener('mouseup', handleMouseUpFreq);
canvas_frequency.addEventListener('mousemove', handleMouseMoveFreq);