/**
 * Udhaar Management System - AI Shop Assistant JavaScript
 * Features:
 * - Natural Language Query processing with Gemini backend
 * - Safe Database grounded answering
 * - Voice speech-to-text recognition (Web Speech API)
 * - Quick prompt chips
 * - Financial insights generation
 */

let recognition = null;
let isRecording = false;

document.addEventListener('DOMContentLoaded', function() {
    initSpeechRecognition();
});

function initSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (window.SpeechRecognition) {
        recognition = new window.SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; // Prioritize Indian English / Hinglish

        recognition.onstart = function() {
            isRecording = true;
            const micBtn = document.getElementById('voiceMicBtn');
            const ind = document.getElementById('voiceIndicator');
            if (micBtn) micBtn.classList.add('listening');
            if (ind) ind.style.display = 'flex';
        };

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            const input = document.getElementById('aiChatInput');
            if (input) {
                input.value = transcript;
                // Auto send on voice input
                handleAiChatSubmit(new Event('submit'));
            }
        };

        recognition.onerror = function(event) {
            console.warn('Speech recognition error:', event.error);
            stopVoiceInput();
        };

        recognition.onend = function() {
            stopVoiceInput();
        };
    } else {
        const micBtn = document.getElementById('voiceMicBtn');
        if (micBtn) {
            micBtn.title = "Voice recognition not supported in this browser";
            micBtn.style.opacity = '0.5';
        }
    }
}

function toggleVoiceInput() {
    if (!recognition) {
        showToast('Voice input is not supported by your current browser. You can type your query in the text box.', 'warning');
        return;
    }
    if (isRecording) {
        recognition.stop();
        stopVoiceInput();
    } else {
        try {
            recognition.start();
        } catch (e) {
            console.error(e);
        }
    }
}

function stopVoiceInput() {
    isRecording = false;
    const micBtn = document.getElementById('voiceMicBtn');
    const ind = document.getElementById('voiceIndicator');
    if (micBtn) micBtn.classList.remove('listening');
    if (ind) ind.style.display = 'none';
}

function askAiQuestion(question) {
    const input = document.getElementById('aiChatInput');
    if (input) {
        input.value = question;
        handleAiChatSubmit(new Event('submit'));
    }
}

function handleAiChatSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();

    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();
    if (!message) return;

    // Append User Message to UI
    appendChatMessage('user', message);
    input.value = '';

    // Create temporary thinking indicator
    const thinkingId = appendThinkingBubble();

    // Disable send button while thinking
    const sendBtn = document.getElementById('aiSendBtn');
    if (sendBtn) sendBtn.disabled = true;

    fetch('/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
    })
    .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
    })
    .then(data => {
        removeThinkingBubble(thinkingId);
        appendChatMessage('bot', data.reply || 'No response generated.');
    })
    .catch(err => {
        removeThinkingBubble(thinkingId);
        appendChatMessage('bot', '⚠️ Sorry, could not connect to AI service. Please verify your internet connection or check your GEMINI_API_KEY.');
    })
    .finally(() => {
        if (sendBtn) sendBtn.disabled = false;
        const chatArea = document.getElementById('chatMessageArea');
        if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
    });
}

function appendChatMessage(sender, text) {
    const chatArea = document.getElementById('chatMessageArea');
    if (!chatArea) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}-message`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = sender === 'bot' ? '🤖' : '👤';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    // Format plain text or simple markdown formatting
    bubble.innerHTML = formatAiResponse(text);

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    chatArea.appendChild(msgDiv);

    chatArea.scrollTop = chatArea.scrollHeight;
}

function appendThinkingBubble() {
    const chatArea = document.getElementById('chatMessageArea');
    if (!chatArea) return null;

    const id = 'thinking-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.className = 'chat-message bot-message';

    msgDiv.innerHTML = `
        <div class="msg-avatar">🤖</div>
        <div class="msg-bubble text-muted">
            <span class="spinner"></span> Checking live shop records & thinking...
        </div>
    `;

    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
    return id;
}

function removeThinkingBubble(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
}

function formatAiResponse(text) {
    // Convert newlines to paragraphs/breaks and bold markdown to <b>
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    return `<p>${formatted}</p>`;
}

function clearAiChat() {
    const chatArea = document.getElementById('chatMessageArea');
    if (chatArea) {
        chatArea.innerHTML = `
            <div class="chat-message bot-message">
                <div class="msg-avatar">🤖</div>
                <div class="msg-bubble">
                    <p>Conversation cleared. How can I help you manage your shop's Udhaar today?</p>
                </div>
            </div>
        `;
    }
}

function loadFinancialInsights() {
    appendChatMessage('user', 'Show retail financial insights & risk overview');
    const thinkingId = appendThinkingBubble();

    fetch('/ai/financial-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        removeThinkingBubble(thinkingId);
        appendChatMessage('bot', data.insights || 'Insights could not be generated.');
    })
    .catch(err => {
        removeThinkingBubble(thinkingId);
        appendChatMessage('bot', '⚠️ Error generating financial insights.');
    });
}
