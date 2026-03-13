// dashboard.js - Logic for FinTrack Dashboard Actions

document.addEventListener('DOMContentLoaded', () => {
    // 0. Session Check - Redirect guests to login
    const userEmail = localStorage.getItem('fintrackEmail');
    if (!userEmail && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }

    // 1. Initial State Data
    let transactions = JSON.parse(localStorage.getItem('fintrackTransactions')) || [];
    let budgetLimit = parseFloat(localStorage.getItem('fintrackBudgetLimit')) || 710.00;
    let incomeTarget = parseFloat(localStorage.getItem('fintrackIncomeTarget')) || 0.00;
    let notifications = JSON.parse(localStorage.getItem('fintrackNotifications')) || [];

    // 2. Notification Manager
    const NotificationManager = {
        add(title, message, type = 'info') {
            const id = Date.now();
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            notifications.unshift({ id, title, message, type, time, read: false });
            
            // Limit to 20 notifications
            if (notifications.length > 20) notifications.pop();
            
            this.save();
            this.render();
            this.updateBadge();
            
            if (typeof showToast === 'function') {
                showToast(title, message, type === 'danger' ? false : (type === 'warning' ? 'warning' : true));
            }
        },
        
        save() {
            localStorage.setItem('fintrackNotifications', JSON.stringify(notifications));
        },
        
        render() {
            const list = document.getElementById('notificationsList');
            if (!list) return;
            
            if (notifications.length === 0) {
                list.innerHTML = '<div class="empty-state">No new notifications</div>';
                return;
            }
            
            list.innerHTML = notifications.map(n => `
                <div class="notification-item ${n.type}" onclick="NotificationManager.markAsRead(${n.id})">
                    <i class='bx ${this.getIcon(n.type)}'></i>
                    <div class="notification-content">
                        <p><strong>${n.title}</strong>: ${n.message}</p>
                        <span>${n.time}</span>
                    </div>
                </div>
            `).join('');
        },
        
        getIcon(type) {
            switch(type) {
                case 'warning': return 'bx-error';
                case 'danger': return 'bx-error-circle';
                case 'success': return 'bx-check-circle';
                default: return 'bx-info-circle';
            }
        },
        
        updateBadge() {
            const badge = document.getElementById('notificationBadge');
            const unreadCount = notifications.filter(n => !n.read).length;
            
            if (unreadCount > 0) {
                badge.innerText = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        },
        
        markAsRead(id) {
            const n = notifications.find(notif => notif.id === id);
            if (n) n.read = true;
            this.save();
            this.updateBadge();
        },
        
        clearAll() {
            notifications = [];
            this.save();
            this.render();
            this.updateBadge();
        }
    };

    // 3. Render Functions
    function updateMetrics() {
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
        const balance = incomeTarget - totalExpense;
        const remainingBudget = budgetLimit - totalExpense;

        document.getElementById('monthlyIncome').innerText = `₹${incomeTarget.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('monthlyExpenses').innerText = `₹${totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('totalBalance').innerText = `₹${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        
        const budgetElem = document.getElementById('remainingBudget');
        const budgetCard = document.getElementById('budgetCard');
        
        budgetElem.innerText = `₹${remainingBudget.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('currentBudgetLimit').innerText = budgetLimit.toLocaleString();

        // Budget Warning logic
        if (remainingBudget < 0) {
            budgetCard.classList.add('alert-state');
            budgetCard.querySelector('.metric-icon').className = 'metric-icon danger';
        } else if (remainingBudget < (budgetLimit * 0.2)) {
            budgetCard.classList.add('alert-state');
            budgetCard.querySelector('.metric-icon').className = 'metric-icon warning';
        } else {
            budgetCard.classList.remove('alert-state');
            budgetCard.querySelector('.metric-icon').className = 'metric-icon success';
        }

        // Update History Section Stats if visible
        updateHistoryStats();
    }

    function updateHistoryStats() {
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
        const balance = totalIncome - totalExpense;

        const incomeElem = document.getElementById('historyTotalIncome');
        const expenseElem = document.getElementById('historyTotalExpense');
        const balanceElem = document.getElementById('historyBalance');

        if (incomeElem) incomeElem.innerText = `₹${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        if (expenseElem) expenseElem.innerText = `₹${totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        if (balanceElem) balanceElem.innerText = `₹${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    }

    function renderTable() {
        const tbody = document.getElementById('transactionBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const query = (document.getElementById('searchInput')?.value || '').toLowerCase();

        // Only show expenses in the "Recent Expenses" table on dashboard
        let filtered = transactions.filter(t => t.type === 'expense');

        // Apply Search Filter
        if (query) {
            filtered = filtered.filter(t => 
                t.desc.toLowerCase().includes(query) || 
                t.category.toLowerCase().includes(query)
            );
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        filtered.slice(0, 8).forEach(t => { 
            const tr = document.createElement('tr');
            const dateObj = new Date(t.date);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            tr.innerHTML = `
                <td><strong>${t.desc}</strong></td>
                <td><span class="badge ${t.type}">${t.category}</span></td>
                <td>${dateStr}</td>
                <td class="amt ${t.type === 'income' ? 'positive' : 'negative'}">
                    ${t.type === 'income' ? '+' : '-'}₹${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
                <td class="action-btns">
                    <i class='bx bx-edit-alt' title="Edit" onclick="openEditModal(${t.id})"></i>
                    <i class='bx bx-trash' title="Delete" onclick="deleteTransaction(${t.id})"></i>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderHistoryTable() {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const searchQuery = (document.getElementById('historySearch')?.value || '').toLowerCase();
        const typeFilter = document.getElementById('filterType')?.value || 'all';
        const catFilter = document.getElementById('filterCategory')?.value || 'all';

        let filtered = [...transactions];

        if (searchQuery) {
            filtered = filtered.filter(t => 
                t.desc.toLowerCase().includes(searchQuery) || 
                t.category.toLowerCase().includes(searchQuery)
            );
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(t => t.type === typeFilter);
        }

        if (catFilter !== 'all') {
            filtered = filtered.filter(t => t.category === catFilter);
        }

        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No transactions found matching filters.</td></tr>';
            return;
        }

        filtered.forEach(t => {
            const tr = document.createElement('tr');
            const dateObj = new Date(t.date);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td><span class="badge ${t.type}">${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</span></td>
                <td>${t.category}</td>
                <td class="amt ${t.type === 'income' ? 'positive' : 'negative'}">
                    ${t.type === 'income' ? '+' : '-'}₹${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
                <td>${t.desc}</td>
                <td class="action-btns">
                    <i class='bx bx-edit-alt' title="Edit" onclick="openEditModal(${t.id})"></i>
                    <i class='bx bx-trash' title="Delete" onclick="deleteTransaction(${t.id})"></i>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function saveData() {
        localStorage.setItem('fintrackTransactions', JSON.stringify(transactions));
    }

    // 4. Modal & Form Handling
    const tModal = document.getElementById('transactionModal');
    const openTBtn = document.getElementById('navAddTransaction');
    const closeTBtn = document.getElementById('closeModal');
    const addForm = document.getElementById('addTransactionForm');

    openTBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('modalTitle').innerText = 'Add New Transaction';
        document.getElementById('editTransactionId').value = '';
        document.getElementById('tDate').valueAsDate = new Date();
        document.getElementById('typeExpense').checked = true;
        tModal.classList.add('active');
    });

    closeTBtn.addEventListener('click', () => {
        tModal.classList.remove('active');
        addForm.reset();
        document.getElementById('customCategoryWrapper').style.display = 'none';
    });

    window.openEditModal = function(id) {
        const t = transactions.find(t => t.id === id);
        if (!t) return;

        document.getElementById('modalTitle').innerText = 'Edit Transaction';
        document.getElementById('editTransactionId').value = id;
        document.getElementById('tAmount').value = t.amount;
        document.getElementById('tDate').value = t.date;
        document.getElementById('tDesc').value = t.desc;

        if (t.type === 'income') {
            document.getElementById('typeIncome').checked = true;
        } else {
            document.getElementById('typeExpense').checked = true;
        }

        const categorySelect = document.getElementById('tCategory');
        const customWrapper = document.getElementById('customCategoryWrapper');
        const customInput = document.getElementById('tCustomCategory');

        // Check if category exists in select
        let exists = false;
        for (let i = 0; i < categorySelect.options.length; i++) {
            if (categorySelect.options[i].value === t.category) {
                exists = true;
                break;
            }
        }

        if (exists) {
            categorySelect.value = t.category;
            customWrapper.style.display = 'none';
        } else {
            categorySelect.value = 'Other';
            customWrapper.style.display = 'block';
            customInput.value = t.category;
        }

        tModal.classList.add('active');
    };

    addForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const editId = document.getElementById('editTransactionId').value;
        const type = document.querySelector('input[name="tType"]:checked').value;
        const amount = parseFloat(document.getElementById('tAmount').value);
        let category = document.getElementById('tCategory').value;
        const date = document.getElementById('tDate').value;
        const desc = document.getElementById('tDesc').value;

        if (category === 'Other') {
            category = document.getElementById('tCustomCategory').value || 'Other';
        }

        if (amount <= 0 || !desc) {
            NotificationManager.add('Error', 'Please provide valid inputs.', 'danger');
            return;
        }

        if (editId) {
            // Edit existing
            const index = transactions.findIndex(t => t.id == editId);
            if (index !== -1) {
                transactions[index] = { ...transactions[index], desc, category, type, amount, date };
                NotificationManager.add('Updated', 'Transaction updated successfully.', 'success');
            }
        } else {
            // Add new
            const newTransaction = { id: Date.now(), desc, category, type, amount, date };
            transactions.push(newTransaction);

            // Notification checks
            if (type === 'expense') {
                const totalExp = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
                if (totalExp > budgetLimit) {
                    NotificationManager.add('Budget Exceeded!', `You've spent ₹${totalExp.toLocaleString()}, which is above your ₹${budgetLimit.toLocaleString()} limit.`, 'danger');
                } else if (totalExp > budgetLimit * 0.8) {
                    NotificationManager.add('Budget Warning', `You've used over 80% of your monthly budget.`, 'warning');
                } else {
                    NotificationManager.add('Transaction Added', `Spent ₹${amount.toLocaleString()} on ${category}.`, 'success');
                }
            } else {
                NotificationManager.add('Income Added', `Added ₹${amount.toLocaleString()} to your balance.`, 'success');
            }
        }

        saveData();
        updateMetrics();
        renderTable();
        renderHistoryTable();
        updateChart();
        tModal.classList.remove('active');
        addForm.reset();
        document.getElementById('customCategoryWrapper').style.display = 'none';
    });

    // Budget & Income Modal Handling
    const budgetModal = document.getElementById('budgetModal');
    const incomeModal = document.getElementById('incomeModal');

    document.getElementById('navSetBudget').addEventListener('click', () => {
        document.getElementById('bAmount').value = budgetLimit;
        budgetModal.classList.add('active');
    });

    document.getElementById('navSetIncome').addEventListener('click', () => {
        document.getElementById('iAmount').value = incomeTarget;
        incomeModal.classList.add('active');
    });

    document.getElementById('closeBudgetModal').addEventListener('click', () => budgetModal.classList.remove('active'));
    document.getElementById('closeIncomeModal').addEventListener('click', () => incomeModal.classList.remove('active'));

    document.getElementById('setBudgetForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newVal = parseFloat(document.getElementById('bAmount').value);
        if (newVal > 0) {
            budgetLimit = newVal;
            localStorage.setItem('fintrackBudgetLimit', budgetLimit);
            document.getElementById('currentBudgetLimit').innerText = budgetLimit.toLocaleString();
            updateMetrics();
            budgetModal.classList.remove('active');
            NotificationManager.add('Budget Updated', `Your monthly limit is now ₹${budgetLimit.toLocaleString()}.`, 'info');
        }
    });

    document.getElementById('setIncomeForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newVal = parseFloat(document.getElementById('iAmount').value);
        if (newVal >= 0) {
            incomeTarget = newVal;
            localStorage.setItem('fintrackIncomeTarget', incomeTarget);
            updateMetrics();
            incomeModal.classList.remove('active');
            NotificationManager.add('Income Updated', `Monthly income target set to ₹${incomeTarget.toLocaleString()}.`, 'info');
        }
    });

    // 5. Chart Integration
    let myChart = null;
    function updateChart() {
        const ctx = document.getElementById('financeChart');
        if(!ctx) return;

        const expenses = transactions.filter(t => t.type === 'expense').reduce((a,b)=>a+b.amount,0);
        let remaining = budgetLimit - expenses;
        if (remaining < 0) remaining = 0;

        if(myChart) {
            myChart.data.datasets[0].data = [remaining, expenses];
            myChart.update();
        } else {
            myChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Remaining Budget', 'Spent'],
                    datasets: [{
                        data: [remaining, expenses],
                        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                        borderColor: ['#10B981', '#ef4444'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#94A3B8', font: { family: 'Outfit'} } }
                    },
                    cutout: '75%'
                }
            });
        }
    }

    // 6. Global Actions & Search
    window.deleteTransaction = function(id) {
        if(confirm("Delete this transaction?")) {
            transactions = transactions.filter(t => t.id !== id);
            saveData();
            updateMetrics();
            renderTable();
            updateChart();
            NotificationManager.add('Deleted', 'Transaction removed.', 'info');
        }
    }

    document.getElementById('searchInput')?.addEventListener('input', () => renderTable());

    // History Filters Event Listeners
    document.getElementById('historySearch')?.addEventListener('input', () => renderHistoryTable());
    document.getElementById('filterType')?.addEventListener('change', () => renderHistoryTable());
    document.getElementById('filterCategory')?.addEventListener('change', () => renderHistoryTable());

    const notifyBtn = document.getElementById('notifyTestBtn');
    const notifyDropdown = document.getElementById('notificationsDropdown');
    
    notifyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifyDropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => notifyDropdown.classList.remove('active'));
    document.getElementById('clearNotifications').addEventListener('click', () => NotificationManager.clearAll());

    // Initialize
    updateMetrics();
    renderTable();
    updateChart();
    NotificationManager.render();
    NotificationManager.updateBadge();

    // RESTORED Profile Loading
    const savedUser = localStorage.getItem('fintrackUser') || 'ALFRIN JEBIC';
    if (savedUser) {
        const profileNameElem = document.getElementById('profileName');
        const profileImageElem = document.getElementById('profileImage');
        if (profileNameElem) profileNameElem.innerText = savedUser;
        if (profileImageElem) profileImageElem.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(savedUser)}&background=4F46E5&color=fff`;
    }

    // RESTORED Profile Edit Modal Handling
    const profileModal = document.getElementById('profileModal');
    const openProfileBtn = document.querySelector('.user-profile');
    const closeProfileBtn = document.getElementById('closeProfileModal');
    const profileForm = document.getElementById('editProfileForm');

    if (openProfileBtn && profileModal) {
        openProfileBtn.addEventListener('click', () => {
            const currentName = document.getElementById('profileName').innerText;
            document.getElementById('pName').value = currentName;
            
            const email = localStorage.getItem('fintrackEmail') || 'user@example.com';
            const joinDate = localStorage.getItem('fintrackJoinDate') || 'Mar 2026';
            document.getElementById('pEmail').value = email;
            document.getElementById('pJoinDate').value = joinDate;

            profileModal.classList.add('active');
        });
    }

    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            profileModal.classList.remove('active');
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newName = document.getElementById('pName').value.trim();
            if (newName) {
                localStorage.setItem('fintrackUser', newName);
                const profileNameElem = document.getElementById('profileName');
                const profileImageElem = document.getElementById('profileImage');
                if (profileNameElem) profileNameElem.innerText = newName;
                if (profileImageElem) profileImageElem.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=4F46E5&color=fff`;
                profileModal.classList.remove('active');
        NotificationManager.add('Profile Updated', `Your display name has been updated to ${newName}.`, 'success');
            }
        });
    }

    // AI Assistant Management (FinBot)
    const GEMINI_API_KEY = 'AIzaSyBfINHN7btJsibwDO-fmFtF3gCgCl2pnSw'; // FinBot AI Key

    const FinBot = {
        isOpen: false,
        element: document.getElementById('finbotChat'),
        fab: document.getElementById('finbotFab'),
        closeBtn: document.getElementById('closeFinbotChat'),
        messagesContainer: document.getElementById('chatMessages'),
        inputField: document.getElementById('chatInput'),
        sendBtn: document.getElementById('sendMessageBtn'),
        actions: document.querySelectorAll('.quick-action-btn'),
        greeted: false,

        init() {
            if(!this.element || !this.fab) return;
            
            this.fab.addEventListener('click', () => this.toggleChat());
            this.closeBtn.addEventListener('click', () => this.toggleChat());
            
            this.sendBtn.addEventListener('click', () => this.handleSend());
            this.inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSend();
            });

            this.actions.forEach(btn => {
                btn.addEventListener('click', (e) => this.handleQuickAction(e.target.dataset.action));
            });
            
            // Initial check for smart notifications (simulated delay)
            setTimeout(() => this.checkProactiveInsights(), 3000);
        },

        toggleChat() {
            this.isOpen = !this.isOpen;
            if(this.isOpen) {
                this.element.classList.add('active');
                if(!this.greeted) {
                    this.addBotMessage("Hi there! I'm <strong>FinBot</strong>, your personal AI financial assistant. 🤖✨<br><br>I'm powered by advanced AI and ready to analyze your spending or answer any questions you have. How can I assist you today?");
                    this.greeted = true;
                }
                setTimeout(() => this.inputField.focus(), 400);
            } else {
                this.element.classList.remove('active');
            }
        },

        addMessage(text, sender) {
            const div = document.createElement('div');
            div.className = `message ${sender}`;
            div.innerHTML = text;
            this.messagesContainer.appendChild(div);
            this.scrollToBottom();
        },

        addBotMessage(text) {
            this.addMessage(text, 'bot');
        },

        addUserMessage(text) {
            this.addMessage(text, 'user');
        },

        showTyping() {
            const thinking = document.getElementById('aiThinking');
            if (thinking) {
                thinking.style.display = 'block';
                this.scrollToBottom();
            }
        },

        hideTyping() {
            const thinking = document.getElementById('aiThinking');
            if (thinking) thinking.style.display = 'none';
        },

        scrollToBottom() {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        },

        async handleSend() {
            const text = this.inputField.value.trim();
            if(!text) return;
            
            this.addUserMessage(text);
            this.inputField.value = '';
            
            this.showTyping();
            await this.processQuery(text.toLowerCase(), text);
        },

        async handleQuickAction(action) {
            this.showTyping();
            switch(action) {
                case 'add_expense':
                    setTimeout(() => {
                        this.hideTyping();
                        this.addBotMessage("Opening the Add Expense form for you...");
                        setTimeout(() => document.getElementById('navAddTransaction').click(), 400);
                    }, 500);
                    break;
                case 'monthly_report':
                    await this.processQuery('show my monthly expenses', 'monthly report');
                    break;
                case 'budget_status':
                    await this.processQuery('budget status', 'budget status');
                    break;
                case 'saving_tips':
                    await this.processQuery('give me financial saving tips', 'give me financial saving tips');
                    break;
            }
        },

        async processQuery(lowerQuery, originalQuery) {
            const allExpenses = transactions.filter(t => t.type === 'expense');
            const totalExp = allExpenses.reduce((a, b) => a + b.amount, 0);
            
            this.showTyping();
            
            // Artificial delay to simulate "AI Thinking"
            const simulateDelay = () => new Promise(res => setTimeout(res, 800 + Math.random() * 500));
            
            // 1. Handle explicit local dashboard queries for exact UI data formatting
            if (lowerQuery.includes('monthly expenses') || lowerQuery.includes('how much did i spend')) {
                await simulateDelay();
                this.hideTyping();
                this.addBotMessage(`Your total monthly expenses are currently <strong>₹${totalExp.toLocaleString()}</strong>.`);
                if (totalExp > 0) this.analyzeTopCategory(allExpenses);
                return;
            } 
            else if (lowerQuery.includes('budget status') || lowerQuery.includes('budget')) {
                await simulateDelay();
                this.hideTyping();
                const remaining = budgetLimit - totalExp;
                const perc = Math.round((totalExp / budgetLimit) * 100);
                this.addBotMessage(`You have a monthly budget of <strong>₹${budgetLimit.toLocaleString()}</strong>.<br>You have spent <strong>₹${totalExp.toLocaleString()}</strong> (${perc}%).<br>Remaining: <strong>₹${Math.max(0, remaining).toLocaleString()}</strong>`);
                return;
            }
            else if (lowerQuery.includes('most money') || lowerQuery.includes('highest expense')) {
                await simulateDelay();
                this.hideTyping();
                if (allExpenses.length === 0) {
                    this.addBotMessage("You don't have any expenses recorded yet.");
                    return;
                }
                this.analyzeTopCategory(allExpenses);
                return;
            }
            else if (lowerQuery.includes('recent transactions') || lowerQuery.includes('last transactions')) {
                await simulateDelay();
                this.hideTyping();
                if(transactions.length === 0) {
                    this.addBotMessage("No recent transactions found.");
                    return;
                }
                const recent = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
                let html = "Here are your latest transactions:<br><br>";
                recent.forEach(t => {
                    const sign = t.type === 'income' ? '+' : '-';
                    html += `• ${t.desc} (${t.category}): <strong>${sign}₹${t.amount.toLocaleString()}</strong><br>`;
                });
                this.addBotMessage(html);
                return;
            }

            // 2. Extensible offline fallback engine for ANY other question
            this.hideTyping();
            const response = this.generateLocalResponse(lowerQuery, totalExp);
            this.addBotMessage(response);
        },

        generateLocalResponse(query, totalExp) {
            // General Greetings
            if (/hi|hello|hey|greetings|morning|afternoon|evening/i.test(query)) {
                return "Hi there! 👋 I'm FinBot, your personal assistant. I'm ready to help with your finances or answer any general questions you have! What's on your mind?";
            }
            if (/who are you|what are you|your name/i.test(query)) {
                return "I'm FinBot, an advanced AI-inspired assistant integrated into your FinTrack dashboard. I specialize in finance but have a broad knowledge base!";
            }
            if (/thank you|thanks|thx/i.test(query)) {
                return "You're very welcome! I'm here to make your life easier. Anything else?";
            }

            // Mathematics & Logic
            if (/math|mathematics|calculation/i.test(query)) {
                return "Mathematics is the language of the universe! It's divided into several branches like Arithmetic (adding/subtracting), Algebra (equations), and Geometry (shapes). It's the core of everything we do in FinTrack!";
            }
            if (/addition|add/i.test(query)) {
                return "<strong>Addition</strong> is combining numbers. <strong>Key features:</strong><br>• <strong>Sum:</strong> The result of addition.<br>• <strong>Commutativity:</strong> 5 + 2 is the same as 2 + 5.<br>• <strong>Identity:</strong> Adding 0 doesn't change the number.";
            }
            if (/subtraction|minus/i.test(query)) {
                return "<strong>Subtraction</strong> is finding the difference between numbers. In your dashboard, it's used to calculate your remaining balance!";
            }
            if (/multiplication|multiply/i.test(query)) {
                return "<strong>Multiplication</strong> is repeated addition. For example, 3 × 4 is just 4 added to itself three times (4+4+4 = 12).";
            }
            if (/percentage|percent/i.test(query)) {
                return "A <strong>Percentage</strong> is a number out of 100. To find a percentage, multiply the part by 100 and divide by the total. Essential for tracking budget usage!";
            }

            // Technology & AI
            if (/what is ai|artificial intelligence/i.test(query)) {
                return "<strong>Artificial Intelligence (AI)</strong> is the simulation of human intelligence by machines, especially computer systems. It includes learning, reasoning, and self-correction. I'm a basic example of AI logic!";
            }
            if (/what is chatgpt|openai/i.test(query)) {
                return "<strong>ChatGPT</strong> is a powerful AI language model created by OpenAI. It can generate text, code, and answer complex questions. I aim to provide a similar helpful experience right here!";
            }
            if (/algorithm/i.test(query)) {
                return "An <strong>Algorithm</strong> is a set of step-by-step instructions to solve a problem. My dashboard logic use algorithms to calculate your charts and metrics!";
            }
            if (/internet|web|www/i.test(query)) {
                return "The <strong>Internet</strong> is a global network of computers. The <strong>Web</strong> (World Wide Web) is just one way information is shared over the internet using browsers like this one.";
            }

            // Science & Nature
            if (/science|scientific/i.test(query)) {
                return "Science is the systematic study of the structure and behavior of the physical and natural world through observation and experiment.";
            }
            if (/space|planets|universe/i.test(query)) {
                return "The <strong>Universe</strong> is everything we can touch, feel, sense, measure, or detect. Our solar system has 8 planets, with Earth being the 3rd from the Sun!";
            }
            if (/earth|world/i.test(query)) {
                return "Earth is our home! It's about 4.5 billion years old and is the only planet known to support life.";
            }
            if (/water|h2o/i.test(query)) {
                return "Water is essential for life. Its chemical formula is <strong>H2O</strong> — two hydrogen atoms and one oxygen atom.";
            }

            // Economics & Finance (Enhanced)
            if (/inflation/i.test(query)) {
                return "<strong>Inflation</strong> is when prices rise and your money buys less. It's why ₹100 today won't buy as much as ₹100 did ten years ago.";
            }
            if (/compound interest/i.test(query)) {
                return "<strong>Compound Interest</strong> is interest on interest. It's the most powerful tool for growing wealth over time!";
            }
            if (/stock|market|investing/i.test(query)) {
                return "<strong>Stocks</strong> represent ownership in a company. The <strong>Stock Market</strong> is where these shares are traded. Investing is how you build long-term wealth.";
            }
            if (/crypto|bitcoin/i.test(query)) {
                return "<strong>Cryptocurrency</strong> is digital money secured by cryptography. Bitcoin was the first one. They are highly volatile, so be careful with your budget!";
            }

            // General & Interactive
            if (/joke|funny/i.test(query)) {
                const jokes = [
                    "Why did the student eat his math homework? Because the teacher said it was a piece of cake!",
                    "What's the best way to double your money? Fold it in half and put it back in your pocket.",
                    "Why don't scientists trust atoms? Because they make up everything!"
                ];
                return jokes[Math.floor(Math.random() * jokes.length)];
            }
            if (/quote|motivation/i.test(query)) {
                const quotes = [
                    "\"The goal is not to be rich, but to be financially free.\"",
                    "\"An investment in knowledge pays the best interest.\" - Benjamin Franklin",
                    "\"Don't count the days, make the days count.\""
                ];
                return quotes[Math.floor(Math.random() * quotes.length)];
            }
            if (/what can you do|help|features/i.test(query)) {
                return "I'm a general knowledge bot! I can:<br>• Analyze your <strong>finances</strong><br>• Explain <strong>Math & Science</strong><br>• Define <strong>Tech & AI</strong> terms<br>• Tell <strong>jokes</strong> and <strong>quotes</strong><br>Just ask anything!";
            }

            // Catch-all fallbacks
            if (/doing well|am i okay|status|my health/i.test(query)) {
                if (totalExp > budgetLimit) {
                    return `You are currently <strong>over your budget limit</strong> by ₹${(totalExp - budgetLimit).toLocaleString()}. Time to freeze spending!`;
                } else if (totalExp > (budgetLimit * 0.8)) {
                    return "You are getting close to your budget limit. I advise caution for the rest of the month.";
                } else if (totalExp === 0) {
                    return "You haven't spent anything yet! Are you being highly frugal, or have you just not logged your expenses yet?";
                } else {
                    return "You are doing great! Your spending is well under control compared to your limits.";
                }
            }

            if (/should i buy|can i afford/i.test(query)) {
                return "Before buying something new, ask yourself: Is it a need or a want? And if it's a want, wait 48 hours to see if you still desire it just as much. Also, check your budget status!";
            }
            if (/credit card/i.test(query)) {
                return "Credit cards are great for rewards and building credit, but <strong>only</strong> if you pay the balance in full every single month. Otherwise, high interest rates will destroy your savings!";
            }
            if (/tax|taxes/i.test(query)) {
                return "<strong>Taxes</strong> are mandatory contributions to state revenue, levied by the government on workers' income and business profits. Understanding your local tax brackets can help you plan your net (take-home) income more accurately!";
            }
            if (/debt|loan/i.test(query)) {
                return "Not all debt is bad, but <strong>high-interest debt</strong> (like credit cards) is a financial emergency. Aim to pay off high-interest loans first—a strategy often called the 'Avalanche Method'.";
            }
            if (/credit score/i.test(query)) {
                return "A <strong>credit score</strong> is a number between 300–850 that depicts a consumer's creditworthiness. The higher the score, the better you look to potential lenders. Pay your bills on time to keep it high!";
            }

            // Default highly varied catch-all
            const fallbacks = [
                "That's an interesting topic! While I focus mostly on your dashboard stats and basic financial concepts, remember that tracking every expense is the first step to financial freedom.",
                "I'm still learning! My main expertise right now is analyzing your spending. Could you ask me about your budgets, expenses, or saving tips?",
                "Not entirely sure on that one! However, I can always show you your 'monthly expenses' or 'budget status' if you'd like.",
                "Hmm, I don't have a precise answer. But speaking of wealth, have you reviewed your recent transactions today?",
                "I might need a tiny update to answer that specifically! Try asking me something like 'how much did I spend?' or 'tell me a joke'.",
                "I'm continuously being upgraded. For now, try asking me 'What is a budget?' or to 'Show my recent transactions'."
            ];
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        },

        analyzeTopCategory(expensesArray) {
            const categorySums = {};
            expensesArray.forEach(t => {
                categorySums[t.category] = (categorySums[t.category] || 0) + t.amount;
            });
            
            let topCat = '';
            let maxAmt = 0;
            for(let cat in categorySums) {
                if(categorySums[cat] > maxAmt) {
                    maxAmt = categorySums[cat];
                    topCat = cat;
                }
            }
            
            if(topCat) {
                const saving = Math.round(maxAmt * 0.15);
                this.addBotMessage(`You spent the most on <strong>${topCat}</strong> (₹${maxAmt.toLocaleString()}).<br>Reducing it by 15% could save approximately <strong>₹${saving.toLocaleString()}</strong>.`);
            }
        },

        checkProactiveInsights() {
            if(transactions.length === 0) return;
            
            const allExpenses = transactions.filter(t => t.type === 'expense');
            const totalExp = allExpenses.reduce((a, b) => a + b.amount, 0);
            
            if (totalExp > budgetLimit && budgetLimit > 0) {
                this.addWarningNotification(`⚠️ You have exceeded your monthly budget limit of ₹${budgetLimit.toLocaleString()}!`);
            } else if (totalExp >= budgetLimit * 0.9 && budgetLimit > 0) {
                this.addWarningNotification(`⚠️ Your budget is 90% used. You only have ₹${(budgetLimit - totalExp).toLocaleString()} left!`);
            }
        },

        addWarningNotification(msg) {
            // Check if chat is closed so we can visually alert the user
            if(!this.isOpen) {
                this.fab.style.animation = 'pulse-danger 2s infinite';
                
                // Add keyframes if not exist
                if(!document.getElementById('pulse-danger-style')) {
                    const style = document.createElement('style');
                    style.id = 'pulse-danger-style';
                    style.innerHTML = `@keyframes pulse-danger { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }`;
                    document.head.appendChild(style);
                }
                
                // Keep notification in bot's memory
                this.addBotMessage(msg);
                
                // Remove pulse when clicked once
                this.fab.addEventListener('click', function removePulse() {
                    this.style.animation = 'none';
                    if(document.getElementById('pulse-danger-style')) document.getElementById('pulse-danger-style').remove();
                    this.removeEventListener('click', removePulse);
                }, { once: true });
            } else {
                this.addBotMessage(msg);
            }
        }
    };

    FinBot.init();

    // 7. Sidebar Toggle Logic
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (menuBtn && sidebar && mainContent) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            
            // Toggle icon class for visual feedback
            if (sidebar.classList.contains('collapsed')) {
                menuBtn.className = 'bx bx-menu-alt-left'; // Or any other icon
            } else {
                menuBtn.className = 'bx bx-menu';
            }
        });
    }

    // 8. Section Navigation Logic
    const sections = {
        'dashboard': document.getElementById('section-dashboard'),
        'budget': document.getElementById('section-budget'),
        'notifications': document.getElementById('section-notifications'),
        'profile': document.getElementById('section-profile')
    };

    const navLinks = {
        'dashboard': document.getElementById('navDashboard'),
        'budget': document.getElementById('navBudget'),
        'notifications': document.getElementById('navNotifications'),
        'profile': document.getElementById('navProfile'),
        'history': document.querySelector('a[href="#history"]')
    };

    function switchSection(targetId) {
        // Remove active class from all links and sections
        Object.values(navLinks).forEach(link => link?.parentElement.classList.remove('active'));
        Object.values(sections).forEach(section => section?.classList.remove('active-section'));

        // Add active class to target
        if (navLinks[targetId]) navLinks[targetId].parentElement.classList.add('active');
        if (sections[targetId]) {
            sections[targetId].classList.add('active-section');
            // Trigger specific renders
            if (targetId === 'budget') renderBudgetSection();
            if (targetId === 'notifications') renderNotificationCenter();
            if (targetId === 'profile') renderUserProfile();
            if (targetId === 'history') renderHistoryTable();
        }

        // Auto-close sidebar on mobile
        if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed')) {
            menuBtn.click();
        }
    }

    // Assign event listeners to sidebar links
    navLinks.dashboard.addEventListener('click', (e) => { e.preventDefault(); switchSection('dashboard'); });
    navLinks.budget.addEventListener('click', (e) => { e.preventDefault(); switchSection('budget'); });
    navLinks.notifications.addEventListener('click', (e) => { e.preventDefault(); switchSection('notifications'); });
    navLinks.profile.addEventListener('click', (e) => { e.preventDefault(); switchSection('profile'); });
    navLinks.history.addEventListener('click', (e) => { e.preventDefault(); switchSection('history'); });

    // View All History Link
    document.getElementById('viewAllHistory')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection('history');
    });

    // 9. Budget Section Rendering
    function renderBudgetSection() {
        document.getElementById('bLimitVal').innerText = `₹${budgetLimit.toLocaleString()}`;
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
        const remaining = budgetLimit - totalExpense;
        document.getElementById('bRemainingVal').innerText = `₹${remaining.toLocaleString()}`;

        // Category Budgets
        const categories = ['Food', 'Bills', 'Travel', 'Shopping', 'Other'];
        const catList = document.getElementById('categoryBudgetList');
        catList.innerHTML = '';

        categories.forEach(cat => {
            const catExp = transactions.filter(t => t.type === 'expense' && t.category === cat).reduce((a, b) => a + b.amount, 0);
            const perc = Math.min(100, Math.round((catExp / (budgetLimit / 4)) * 100)) || 0; // Simple split for demo
            
            const div = document.createElement('div');
            div.className = 'budget-item';
            div.innerHTML = `
                <div class="budget-item-header">
                    <span>${cat}</span>
                    <span>₹${catExp.toLocaleString()} spent</span>
                </div>
                <div class="budget-progress-bg">
                    <div class="budget-progress-fill ${perc > 90 ? 'danger' : (perc > 70 ? 'warning' : '')}" style="width: ${perc}%"></div>
                </div>
            `;
            catList.appendChild(div);
        });

        renderBudgetCompareChart(totalExpense);
    }

    let budgetCompareChart = null;
    function renderBudgetCompareChart(spent) {
        const ctx = document.getElementById('budgetCompareChart');
        if (!ctx) return;
        
        if (budgetCompareChart) budgetCompareChart.destroy();
        
        budgetCompareChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Monthly Budget', 'Current Spending'],
                datasets: [{
                    label: 'Amount (₹)',
                    data: [budgetLimit, spent],
                    backgroundColor: ['rgba(99, 102, 241, 0.6)', spent > budgetLimit ? 'rgba(239, 68, 68, 0.6)' : 'rgba(16, 185, 129, 0.6)'],
                    borderColor: ['#6366F1', spent > budgetLimit ? '#ef4444' : '#10B981'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } },
                    x: { ticks: { color: '#94A3B8' } }
                }
            }
        });
    }

    // 10. Notification Center Rendering
    function renderNotificationCenter() {
        const list = document.getElementById('fullNotificationsList');
        if (!list) return;

        if (notifications.length === 0) {
            list.innerHTML = '<div class="empty-state">No notifications to show</div>';
            return;
        }

        list.innerHTML = notifications.map(n => `
            <div class="notification-item ${n.type}">
                <i class='bx ${NotificationManager.getIcon(n.type)}'></i>
                <div class="notification-content">
                    <p><strong>${n.title}</strong>: ${n.message}</p>
                    <span>${n.time}</span>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('clearAllNotifBtn').addEventListener('click', () => {
        NotificationManager.clearAll();
        renderNotificationCenter();
    });

    // 11. User Profile Rendering
    function renderUserProfile() {
        const name = localStorage.getItem('fintrackUser') || 'ALFRIN JEBIC';
        const email = localStorage.getItem('fintrackEmail') || 'user@example.com';
        
        document.getElementById('pLargeName').innerText = name;
        document.getElementById('pLargeEmail').innerText = email;
        document.getElementById('pLargeAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4F46E5&color=fff&size=128`;

        const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0) + incomeTarget;
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
        const savings = totalIncome - totalExpense;

        document.getElementById('profileTotalIncome').innerText = `₹${totalIncome.toLocaleString()}`;
        document.getElementById('profileTotalExpense').innerText = `₹${totalExpense.toLocaleString()}`;
        document.getElementById('profileTotalSavings').innerText = `₹${savings.toLocaleString()}`;
    }

    // Connect Profile Actions
    document.getElementById('editProfileBtnNav').addEventListener('click', () => {
        document.querySelector('.user-profile').click(); 
    });

    document.getElementById('logoutBtnProfile').addEventListener('click', () => {
        document.getElementById('logoutBtn').click();
    });

    document.getElementById('updateBudgetBtn').addEventListener('click', () => {
        document.getElementById('navSetBudget').click();
    });

});
