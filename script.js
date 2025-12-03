let currentScore = 0;
let questionCount = 0;
let currentTopic = '';
const MAX_QUESTIONS = 10; // Examen de 10 preguntas

/* --- NAVEGACIÓN --- */
function showSection(id) {
    // Ocultar todas las secciones
    document.querySelectorAll('main > section').forEach(sec => {
        sec.classList.add('hidden');
        sec.classList.remove('active');
    });
    // Mostrar la seleccionada
    const target = document.getElementById(id);
    target.classList.remove('hidden');
    target.classList.add('active');

    // Si salimos de la cámara, apagarla por seguridad
    if(id !== 'camera-section') stopCamera();
}

/* --- LÓGICA DEL EXAMEN --- */
function startQuiz(topic) {
    currentTopic = topic;
    currentScore = 0;
    questionCount = 0;
    
    document.querySelector('.exam-controls').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');
    document.getElementById('score-board').classList.add('hidden');
    
    nextQuestion();
}

function generateQuestion(topic) {
    let question = {};
    let answer, qText, displayAnswer;

    if (topic === 'base10pos') {
        const exp = Math.floor(Math.random() * 10); // 0 a 9
        qText = `¿Cuánto es 10<sup>${exp}</sup>?`;
        answer = Math.pow(10, exp);
        displayAnswer = answer.toLocaleString(); 
    } 
    else if (topic === 'base10neg') {
        const exp = -(Math.floor(Math.random() * 6) + 1); // -1 a -6
        qText = `¿Cuánto es 10<sup>${exp}</sup>?`;
        answer = parseFloat(Math.pow(10, exp).toFixed(6));
        displayAnswer = answer;
    }
    else if (topic === 'scientific') {
        const baseNum = Math.floor(Math.random() * 9) + 1;
        const exp = Math.floor(Math.random() * 4) + 2; 
        qText = `Resuelve: ${baseNum} × 10<sup>${exp}</sup>`;
        answer = baseNum * Math.pow(10, exp);
        displayAnswer = answer.toLocaleString();
    }
    else if (topic === 'sqrt') {
        const base = Math.floor(Math.random() * 50) + 1;
        const square = base * base;
        qText = `¿Raíz cuadrada de ${square}? (√${square})`;
        answer = base;
        displayAnswer = base;
    }

    return { text: qText, correct: answer, display: displayAnswer };
}

function generateOptions(correct, topic) {
    let options = new Set();
    options.add(correct);
    
    // Freno de seguridad: Máximo 20 intentos para encontrar respuestas falsas
    let attempts = 0; 

    while(options.size < 4 && attempts < 20) {
        let fake;
        attempts++; // Contamos los intentos

        if (topic === 'base10pos' || topic === 'scientific') {
            // Generar multiplicando por 10 o dividiendo
            let factor = Math.random() > 0.5 ? 10 : 0.1;
            fake = correct * factor;
            
            // Si da decimales raros en base10pos, redondear
            if(topic === 'base10pos') fake = Math.round(fake);
            
            // Evitar que sea igual
            if(fake === correct) fake = correct + 10;
        } 
        else if (topic === 'base10neg') {
            let fakeExp = -(Math.floor(Math.random() * 6) + 1);
            fake = parseFloat(Math.pow(10, fakeExp).toFixed(6));
        } 
        else { // Raíz cuadrada
            fake = correct + (Math.floor(Math.random() * 10) - 5); 
            if (fake <= 0) fake = 1; 
        }

        if (fake !== correct) {
            options.add(fake);
        }
    }
    

    while (options.size < 4) {
        options.add(correct + options.size + 1);
    }

    return Array.from(options).sort(() => Math.random() - 0.5);
}

function nextQuestion() {
    if (questionCount >= MAX_QUESTIONS) {
        endQuiz();
        return;
    }

    const qData = generateQuestion(currentTopic);
    const options = generateOptions(qData.correct, currentTopic);

    document.getElementById('question-text').innerHTML = `${questionCount + 1}. ${qData.text}`;
    document.getElementById('feedback').innerText = '';
    document.getElementById('next-btn').classList.add('hidden');
    
    const optsContainer = document.getElementById('options-container');
    optsContainer.innerHTML = '';

    options.forEach(opt => {
        const btn = document.createElement('button');
        // Formato visual bonito
        let btnText = opt.toLocaleString();
        if(currentTopic === 'base10neg') btnText = opt; 

        btn.innerText = btnText;
        btn.className = 'option-btn';
        btn.onclick = () => checkAnswer(btn, opt, qData.correct, qData.display);
        optsContainer.appendChild(btn);
    });

    questionCount++;
}

function checkAnswer(btn, selected, correct, correctDisplay) {
    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(b => b.disabled = true);

    if (selected === correct) {
        btn.classList.add('correct');
        document.getElementById('feedback').innerText = "¡Correcto! 🎉";
        currentScore++;
    } else {
        btn.classList.add('wrong');
        document.getElementById('feedback').innerText = `Ups... Era ${correctDisplay}`;
    }
    document.getElementById('next-btn').classList.remove('hidden');
}

function endQuiz() {
    document.getElementById('quiz-container').classList.add('hidden');
    document.getElementById('score-board').classList.remove('hidden');
    
    let msg = currentScore >= 7 ? "¡Muy bien! 👍" : "Sigue practicando 💪";
    document.getElementById('final-score').innerHTML = `${currentScore} / ${MAX_QUESTIONS}<br>${msg}`;
    
    sendExamNotification(currentScore);
}

/* --- NOTIFICACIONES --- */
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("Navegador no soporta notificaciones");
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            new Notification("¡Listo!", { body: "Te avisaremos al terminar el examen." });
            document.getElementById('btn-notify').style.display = 'none';
        }
    });
}

function sendExamNotification(score) {
    if (Notification.permission === "granted") {
        new Notification("Examen finalizado", {
            body: `Obtuviste ${score} de ${MAX_QUESTIONS} puntos.`,
            icon: "potencia_positiva.png", // Usamos una de tus imágenes como ícono
            vibrate: [200, 100, 200]
        });
    }
}

/* --- CÁMARA --- */
let videoStream;

async function startCamera() {
    const video = document.getElementById('video-feed');
    const preview = document.getElementById('photo-preview');
    const placeholder = document.getElementById('camera-placeholder');
    const btnStart = document.getElementById('btn-start-camera');
    const btnTake = document.getElementById('btn-take-photo');

    preview.classList.add('hidden');
    video.classList.remove('hidden');
    placeholder.style.display = 'none';

    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        video.srcObject = videoStream;
        btnStart.classList.add('hidden');
        btnTake.classList.remove('hidden');
    } catch (err) {
        alert("Error: Necesitas HTTPS y dar permisos de cámara.");
    }
}

function takePhoto() {
    const video = document.getElementById('video-feed');
    const canvas = document.getElementById('photo-canvas');
    const preview = document.getElementById('photo-preview');
    const btnStart = document.getElementById('btn-start-camera');
    const btnTake = document.getElementById('btn-take-photo');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    preview.src = canvas.toDataURL('image/png');
    
    video.classList.add('hidden');
    preview.classList.remove('hidden');
    
    stopCamera();
    alert("📸 ¡Capturado! Analizando ejercicio...");
    
    btnStart.innerText = "Tomar otra";
    btnStart.classList.remove('hidden');
    btnTake.classList.add('hidden');
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
}


document.addEventListener("DOMContentLoaded", () => {
    checkExistingPermissions();
});


    if (Notification.permission === "granted") {
        const btnNotify = document.getElementById('btn-notify');
        if (btnNotify) {
            btnNotify.style.display = 'none'; 
        }
    }

    
    navigator.permissions.query({ name: 'camera' }).then(permissionStatus => {
        if (permissionStatus.state === 'granted') {
            const btnStart = document.getElementById('btn-start-camera');
            if (btnStart) {
                btnStart.innerText = "Encender Cámara (Permiso Listo)";
            }
        }
    }).catch(error => {
        console.log("Navegador no soporta consulta de permisos de cámara");
    });
}