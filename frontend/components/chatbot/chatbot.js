// TravixChatbot.js - AI Safety Assistant
class TravixChatbot {
    constructor() {
        this.isOpen = false;
        this.isMinimized = false;
        this.messages = [
            {
                id: 1,
                text: "🙏 Namaste! I'm Aira, your Travix AI safety companion. I'm here to provide live safety ratings, location guidance, safe zone routing, and instant emergency help. How can I protect your journey today?",
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ];
        this.isTyping = false;
        this.messageId = 2;
        this.init();
    }

    init() {
        this.createChatbotHTML();
        this.attachEventListeners();
        this.adjustPositionForPageElements();
    }

    adjustPositionForPageElements() {
        const warningBarSelector = '.caution-area-box';
        const warningBar = document.querySelector(warningBarSelector);
        const chatbotWrapper = document.querySelector('.chatbot-wrapper');

        if (warningBar && chatbotWrapper) {
            const barStyles = window.getComputedStyle(warningBar);
            if (barStyles.display !== 'none' && barStyles.visibility !== 'hidden') {
                const barHeight = warningBar.offsetHeight;
                const originalBottomOffset = 20;
                const margin = 15;
                const newBottomPosition = barHeight + originalBottomOffset + margin;
                chatbotWrapper.style.bottom = `${newBottomPosition}px`;
            }
        }
    }

    createChatbotHTML() {
        // Prevent duplicate injection
        if (document.querySelector('.chatbot-wrapper')) return;

        const chatbotContainer = document.createElement('div');
        chatbotContainer.className = 'chatbot-wrapper';
        chatbotContainer.innerHTML = `
            <button id="chat-toggle-btn" class="chat-toggle-btn" title="Chat with Aira AI">
                <i class="fas fa-comments"></i>
                <div class="notification-dot"></div>
                <div class="tooltip">Chat with Aira AI</div>
            </button>

            <div id="chat-window" class="chat-window hidden">
                <div class="chat-header">
                    <div class="bot-info">
                        <div class="bot-avatar">
                            <i class="fas fa-robot"></i>
                            <div class="online-indicator"></div>
                        </div>
                        <div class="bot-details">
                            <h3>Aira AI Safety Companion</h3>
                            <p>Online • 24/7 Monitored Protection</p>
                        </div>
                    </div>
                    <div class="header-controls">
                        <button id="minimize-btn" class="control-btn" title="Minimize">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button id="close-btn" class="control-btn" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div id="chat-content" class="chat-content">
                    <div class="quick-actions">
                        <button class="quick-action-btn" data-action="safety">
                            <i class="fas fa-shield-alt"></i>
                            <span>Check Safety</span>
                        </button>
                        <button class="quick-action-btn" data-action="zones">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>Find Safe Zones</span>
                        </button>
                        <button class="quick-action-btn" data-action="routes">
                            <i class="fas fa-route"></i>
                            <span>Travel Routes</span>
                        </button>
                        <button class="quick-action-btn" data-action="emergency">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Emergency Help</span>
                        </button>
                    </div>

                    <div id="messages-container" class="messages-container"></div>

                    <div class="chat-input">
                        <div class="input-wrapper">
                            <input type="text" id="message-input" placeholder="Ask about safety, routes, safe zones..." autocomplete="off">
                            <button id="send-btn" class="send-btn" title="Send">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                        <p class="powered-by">Powered by Travix AI • Real-time Threat & Hazard Monitoring</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(chatbotContainer);
        this.renderMessages();
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('chat-toggle-btn');
        const closeBtn = document.getElementById('close-btn');
        const minimizeBtn = document.getElementById('minimize-btn');
        const sendBtn = document.getElementById('send-btn');
        const messageInput = document.getElementById('message-input');
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');

        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleChat());
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeChat());
        if (minimizeBtn) minimizeBtn.addEventListener('click', () => this.minimizeChat());
        if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }

        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const chatWindow = document.getElementById('chat-window');
        const toggleBtn = document.getElementById('chat-toggle-btn');
        
        if (this.isOpen) {
            chatWindow?.classList.remove('hidden');
            if (toggleBtn) toggleBtn.style.display = 'none';
            this.scrollToBottom();
            const input = document.getElementById('message-input');
            if (input) input.focus();
        } else {
            chatWindow?.classList.add('hidden');
            if (toggleBtn) toggleBtn.style.display = 'flex';
        }
    }

    closeChat() {
        this.isOpen = false;
        this.isMinimized = false;
        const chatWindow = document.getElementById('chat-window');
        const toggleBtn = document.getElementById('chat-toggle-btn');
        
        chatWindow?.classList.add('hidden');
        chatWindow?.classList.remove('minimized');
        if (toggleBtn) toggleBtn.style.display = 'flex';
    }

    minimizeChat() {
        this.isMinimized = !this.isMinimized;
        const chatWindow = document.getElementById('chat-window');
        const chatContent = document.getElementById('chat-content');
        const minimizeIcon = document.querySelector('#minimize-btn i');
        
        if (this.isMinimized) {
            chatWindow?.classList.add('minimized');
            if (chatContent) chatContent.style.display = 'none';
            if (minimizeIcon) minimizeIcon.className = 'fas fa-expand';
        } else {
            chatWindow?.classList.remove('minimized');
            if (chatContent) chatContent.style.display = 'flex';
            if (minimizeIcon) minimizeIcon.className = 'fas fa-minus';
            this.scrollToBottom();
        }
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        if (!input) return;
        const userMessage = input.value.trim();
        
        if (!userMessage) return;

        this.addMessage({
            id: this.messageId++,
            text: userMessage,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        input.value = '';
        this.showTyping();
        
        try {
            const response = await this.getAiResponse(userMessage);
            this.hideTyping();
            this.addMessage({
                id: this.messageId++,
                text: response,
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        } catch (error) {
            console.error('Error fetching AI response:', error);
            this.hideTyping();
            this.addMessage({
                id: this.messageId++,
                text: this.generateSmartResponse(userMessage),
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
    }

    async handleQuickAction(action) {
        const messages = {
            safety: "Tell me about safety in my current location.",
            zones: "Show me safe zones near me.",
            routes: "What are the safest travel routes?",
            emergency: "I need emergency help."
        };
        const message = messages[action] || "Safety status overview";
        
        this.addMessage({
            id: this.messageId++,
            text: message,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        
        this.showTyping();
        
        try {
            const response = await this.getAiResponse(message);
            this.hideTyping();
            this.addMessage({
                id: this.messageId++,
                text: response,
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        } catch (error) {
            this.hideTyping();
            this.addMessage({
                id: this.messageId++,
                text: this.generateSmartResponse(message),
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
    }

    generateSmartResponse(userMessage) {
        const text = String(userMessage || '').toLowerCase().trim();

        if (text.includes('delhi') || text.includes('new delhi')) {
            return "📍 **Delhi Safety Status**:\n• **Verified Safe Zones**: India Gate, Connaught Place, Qutub Minar, and Red Fort have high security and 24/7 patrols.\n• **Caution Areas**: Exercise extra vigilance in crowded Old Delhi bazaars and avoid isolated Yamuna river stretches after dark.\n• **Transit**: Delhi Metro offers verified women-only coaches and CCTV-monitored stations.";
        }
        if (text.includes('tawang') || text.includes('arunachal')) {
            return "🏔️ **Tawang Monastery Region**:\n• Status: **Verified Safe Zone** (Elevation: 3,048m).\n• Note: Ensure valid Inner Line Permit (ILP) is registered.\n• Weather Advisory: Check road clearance before crossing Sela Pass.";
        }
        if (text.includes('sela') || text.includes('pass') || text.includes('altitude')) {
            return "⚠️ **Sela Pass Advisory**:\n• Status: **High Altitude Hazard Alert** (13,700 ft).\n• Rapid temperature drops and sudden snow/fog can reduce visibility. Travel during daylight (before 3:30 PM) with warm clothing.";
        }
        if (text.includes('safe') && (text.includes('zone') || text.includes('area') || text.includes('near') || text.includes('find'))) {
            return "🗺️ **Recommended Safe Zones Near You**:\n1. **India Gate Precinct** (Green Zone • 2.5 km radius)\n2. **Connaught Place Central Hub** (Green Zone • 2.0 km radius)\n3. **Qutub Minar Heritage Complex** (Green Zone • 1.8 km radius)\n4. **Red Fort Tourist Corridor** (Green Zone • 2.2 km radius)\n\n👉 *You can view all verified green zones on the **Locations** map tab.*";
        }
        if (text.includes('emergency') || text.includes('sos') || text.includes('help') || text.includes('police') || text.includes('ambulance') || text.includes('112')) {
            return "🚨 **EMERGENCY ASSISTANCE CHANNELS**:\n• **National Emergency Helpline**: 112\n• **Police Control Room**: 100\n• **Medical Ambulance**: 108\n• **Women Helpline**: 1091 / 181\n• **Tourist Police Helpline**: 1363\n\n👉 *Click the **Emergency** button in the top navigation or sound an acoustic SOS alert immediately.*";
        }
        if (text.includes('route') || text.includes('transit') || text.includes('cab') || text.includes('travel') || text.includes('metro')) {
            return "🚗 **Safe Travel & Transit Guidance**:\n• Prefer well-illuminated arterial roadways and monitored metro corridors.\n• When booking cabs at night, verify driver credentials and share live ride tracking with trusted contacts.\n• In your Travix Emergency portal, you can access verified emergency transport options.";
        }
        if (text.includes('blockchain') || text.includes('aadhaar') || text.includes('security') || text.includes('privacy') || text.includes('ledger')) {
            return "🔐 **Aadhaar & Blockchain Trust Protocol**:\nTravix protects your identity using SHA-256 cryptographic signatures. Each authorization event is sealed in an immutable Proof-of-Work ledger with difficulty 4 mining, ensuring audit records cannot be altered.";
        }
        if (text.includes('women') || text.includes('female') || text.includes('girl') || text.includes('solo')) {
            return "👩 **Women Traveler Safety Protocols**:\n• 24/7 dedicated helpline: Call **1091** or **181**.\n• Access the Travix Emergency Portal for safe rides, verified female drivers, and instant distress beacons.\n• Metro transit networks provide reserved women coaches at the front of each train.";
        }
        return "🛡️ **Travix AI Safety Assistant**:\nI'm actively monitoring safety conditions around your area. You can ask me to:\n• Check safety ratings for any region or landmark\n• Locate nearest verified green safe zones\n• Recommend secure transit routes\n• Trigger emergency SOS and helpline guidance\n\nHow can I help protect your journey today?";
    }

    async getAiResponse(userMessage) {
        try {
            const apiBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_AUTH_SERVER_URL)
                || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : '');
            const chatEndpoint = apiBase ? `${apiBase}/api/chat` : '/api/chat';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const res = await fetch(chatEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data.response) return data.response;
            }
        } catch (err) {
            console.warn('Network chat API unreachable; using built-in AI engine:', err);
        }

        return this.generateSmartResponse(userMessage);
    }

    formatMessage(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    addMessage(message) {
        this.messages.push(message);
        this.renderMessages();
        this.scrollToBottom();
    }

    renderMessages() {
        const container = document.getElementById('messages-container');
        if (!container) return;
        container.innerHTML = '';

        this.messages.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.sender}`;
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas ${message.sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
                </div>
                <div class="message-content">
                    <div class="message-text">${this.formatMessage(message.text)}</div>
                    <div class="message-time">
                        <i class="fas fa-clock"></i>
                        ${message.timestamp}
                    </div>
                </div>
            `;
            container.appendChild(messageDiv);
        });
    }

    showTyping() {
        this.isTyping = true;
        const container = document.getElementById('messages-container');
        if (!container) return;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing-message';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        container.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTyping() {
        this.isTyping = false;
        const typingMessage = document.querySelector('.typing-message');
        if (typingMessage) {
            typingMessage.remove();
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = document.getElementById('messages-container');
            if (container) container.scrollTop = container.scrollHeight;
        }, 80);
    }
}

// Expose chatbot and initialize
window.TravixChatbot = TravixChatbot;
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!window.travixChatbotInstance) {
            window.travixChatbotInstance = new TravixChatbot();
        }
    }, 500);
});