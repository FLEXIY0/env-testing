const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = IS_LOCAL ? 'http://localhost:3000/api/posts' : 'posts.json';

const PASS_PHRASE = "все будет хорошо";
let isEditMode = false;
let posts = [];

const modeToggle = document.getElementById('mode-toggle');
const modeLabel = document.getElementById('mode-label');
const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('password-input');
const passwordError = document.getElementById('password-error');
const newPostText = document.getElementById('new-post-text');
const postsContainer = document.getElementById('posts-container');
const toggleContainer = document.querySelector('.toggle-container');

window.onload = () => {
    // Прячем тумблер редактирования, если мы не на локальном сервере (GitHub Pages)
    if (!IS_LOCAL) {
        toggleContainer.style.display = 'none';
    }

    loadPosts();
    modeToggle.checked = false;
};

// --- UI Переключения ---
modeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        e.target.checked = false;
        openPasswordModal();
    } else {
        setEditMode(false);
    }
});

function openPasswordModal() {
    passwordModal.style.display = 'flex';
    passwordInput.value = '';
    passwordError.style.display = 'none';
    passwordInput.focus();
}

function closePasswordModal() {
    passwordModal.style.display = 'none';
}

passwordInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') verifyPassword();
});

function verifyPassword() {
    if (passwordInput.value.toLowerCase().trim() === PASS_PHRASE) {
        closePasswordModal();
        setEditMode(true);
    } else {
        passwordError.style.display = 'block';
    }
}

function setEditMode(enable) {
    isEditMode = enable;
    modeToggle.checked = enable;
    if (enable) {
        document.body.classList.add('edit-mode');
        modeLabel.textContent = 'Редактирование';
    } else {
        document.body.classList.remove('edit-mode');
        modeLabel.textContent = 'Просмотр';
        renderPosts();
    }
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// --- Запросы к API ---

async function loadPosts() {
    try {
        // Добавляем timestamp чтобы браузер не кэшировал старый JSON
        const urlToFetch = IS_LOCAL ? API_URL : `${API_URL}?t=${Date.now()}`;
        const response = await fetch(urlToFetch);
        if (response.ok) {
            posts = await response.json();
            renderPosts();
        } else if (!IS_LOCAL && response.status === 404) {
             // Файл posts.json еще не создан в репозитории
             posts = [];
             renderPosts();
        }
    } catch (error) {
        console.error("Ошибка загрузки:", error);
    }
}

async function addPost() {
    if (!IS_LOCAL) return alert("Редактирование доступно только на localhost");
    
    const text = newPostText.value.trim();
    if (!text) return;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (response.ok) {
            newPostText.value = '';
            await loadPosts();
        }
    } catch (error) {
        console.error("Ошибка сохранения:", error);
    }
}

async function saveEditing(id) {
    if (!IS_LOCAL) return alert("Редактирование доступно только на localhost");

    const newText = document.getElementById(`edit-text-${id}`).value.trim();
    if (!newText) {
        alert("Текст поста не может быть пустым.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: newText })
        });
        
        if (response.ok) {
            await loadPosts();
        }
    } catch (error) {
        console.error("Ошибка сохранения редактирования:", error);
    }
}

async function revertToOriginal(id) {
    if (!IS_LOCAL) return alert("Редактирование доступно только на localhost");

    if (confirm("Вы уверены, что хотите вернуть этот пост к первоначальной версии? Текущая версия будет сохранена в истории, но отображаться будет первая версия.")) {
        try {
            const response = await fetch(`${API_URL}/${id}/revert`, {
                method: 'POST'
            });
            if (response.ok) {
                await loadPosts();
            }
        } catch (error) {
            console.error("Ошибка отката:", error);
        }
    }
}


// --- Рендеринг ---

function renderPosts() {
    postsContainer.innerHTML = '';
    
    if (posts.length === 0) {
        postsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Записей пока нет.</p>';
        return;
    }

    posts.forEach(post => {
        const postEl = document.createElement('div');
        postEl.className = 'glass post';
        postEl.setAttribute('data-id', post.id);

        const originalText = post.versions[0].text;
        const currentVersionIndex = post.versions.length - 1;
        const currentText = post.versions[currentVersionIndex].text;
        
        const isEdited = post.versions.length > 1 && currentText !== originalText;

        // Генерируем ссылки истории
        let historyLinks = '';
        if (post.versions.length > 1) {
            post.versions.forEach((ver, idx) => {
                historyLinks += `<a href="#" onclick="showVersion(${post.id}, ${idx}); return false;" style="color: var(--primary); text-decoration: none; margin-right: 10px;">v${idx + 1} (${formatDate(ver.timestamp)})</a> `;
            });
        }

        let html = `
            <div class="post-header">
                <span>Написано: ${formatDate(post.createdAt)}</span>
                <span style="font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">версия: ${post.versions.length}</span>
            </div>
            
            <div class="post-content" id="content-${post.id}">${escapeHtml(currentText)}</div>
            
            <div class="hidden" id="edit-form-${post.id}" style="margin-top: 1rem;">
                <textarea id="edit-text-${post.id}">${escapeHtml(currentText)}</textarea>
                <div style="margin-top: 10px; display: flex; gap: 10px;">
                    <button class="btn-success" onclick="saveEditing(${post.id})">Сохранить</button>
                    <button class="btn-secondary" style="background: rgba(255,255,255,0.1);" onclick="cancelEditing(${post.id})">Отмена</button>
                </div>
            </div>
            
            ${historyLinks ? `<div style="margin-top: 1rem; font-size: 0.85rem; border-top: 1px solid var(--card-border); padding-top: 0.5rem; color: var(--text-muted);"><b style="color: white">История версий (нажмите для просмотра):</b><br>${historyLinks}</div>` : ''}

            <div class="post-footer">
                <span>${post.updatedAt ? '✏️ Последнее изменение: ' + formatDate(post.updatedAt) : ''}</span>
            </div>

            <div class="edit-controls" id="controls-${post.id}">
                <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="startEditing(${post.id})">Редактировать</button>
                ${isEdited ? `<button class="btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="revertToOriginal(${post.id})">Вернуться к 1 версии</button>` : ''}
            </div>
        `;

        postEl.innerHTML = html;
        postsContainer.appendChild(postEl);
    });
}

function showVersion(postId, versionIndex) {
    const post = posts.find(p => p.id === postId);
    if (!post || !post.versions[versionIndex]) return;
    
    // Меняем текст поста инлайн
    document.getElementById(`content-${postId}`).innerHTML = escapeHtml(post.versions[versionIndex].text);
    
    // Если мы в edit mode, обновим и textarea, чтобы было что редактировать (при желании)
    const textarea = document.getElementById(`edit-text-${postId}`);
    if (textarea) {
        textarea.value = post.versions[versionIndex].text;
    }
}

function startEditing(id) {
    document.getElementById(`content-${id}`).classList.add('hidden');
    document.getElementById(`controls-${id}`).classList.add('hidden');
    document.getElementById(`edit-form-${id}`).classList.remove('hidden');
}

function cancelEditing(id) {
    document.getElementById(`edit-form-${id}`).classList.add('hidden');
    document.getElementById(`content-${id}`).classList.remove('hidden');
    if (isEditMode) {
        document.getElementById(`controls-${id}`).style.display = 'flex';
        document.getElementById(`controls-${id}`).classList.remove('hidden');
    }
}
