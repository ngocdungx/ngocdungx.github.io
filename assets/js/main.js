/**
 * Tạ Ngọc Dũng - Personal Portfolio Main Script
 * Version: 2.0 (Modern UX/UI Overhaul)
 */

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initMobileNav();
    initScrollEvents();
    initQualificationTabs();
    initProjectToolbar();
    initCertLightbox();
    initContactForm();
    initServiceWorker();
});

/*==================== THEME TOGGLE (DARK / LIGHT) ====================*/
function initThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn) return;

    const themeIcon = themeBtn.querySelector('i');
    const savedTheme = localStorage.getItem('ngocdung_theme');
    const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

    // Apply saved or system theme
    if (savedTheme === 'light' || (!savedTheme && systemPrefersLight)) {
        document.body.classList.add('light-theme');
        updateThemeIcon(true);
    } else {
        document.body.classList.remove('light-theme');
        updateThemeIcon(false);
    }

    themeBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        localStorage.setItem('ngocdung_theme', isLight ? 'light' : 'dark');
        updateThemeIcon(isLight);
    });

    function updateThemeIcon(isLight) {
        if (!themeIcon) return;
        if (isLight) {
            themeIcon.className = 'uil uil-moon';
            themeBtn.setAttribute('title', 'Chuyển sang Giao diện Tối');
        } else {
            themeIcon.className = 'uil uil-sun';
            themeBtn.setAttribute('title', 'Chuyển sang Giao diện Sáng');
        }
    }
}

/*==================== MOBILE NAVIGATION ====================*/
function initMobileNav() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav__link');

    if (navToggle && navMenu) {
        function setMenuOpen(open) {
            navMenu.classList.toggle('show-menu', open);
            navToggle.setAttribute('aria-expanded', String(open));
            navToggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
            const icon = navToggle.querySelector('i');
            if (icon) icon.className = open ? 'uil uil-times' : 'uil uil-apps';
        }

        navToggle.addEventListener('click', () => {
            setMenuOpen(!navMenu.classList.contains('show-menu'));
        });

        // Close menu on link click
        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                setMenuOpen(false);
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !navToggle.contains(e.target) && navMenu.classList.contains('show-menu')) {
                setMenuOpen(false);
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('show-menu')) {
                setMenuOpen(false);
                navToggle.focus();
            }
        });
    }
}

/*==================== SCROLL EVENTS & ACTIVE NAVIGATION ====================*/
function initScrollEvents() {
    const sections = Array.from(document.querySelectorAll('section[id]'));
    const scrollUpBtn = document.getElementById('scroll-up');
    const header = document.getElementById('header');

    // Pre-cache section navlink pairs
    const sectionNavMap = sections.map((sec) => {
        const id = sec.getAttribute('id');
        return {
            element: sec,
            navLink: document.querySelector(`.nav__menu a[href*="#${id}"]`),
            top: 0,
            height: 0
        };
    }).filter(item => item.navLink !== null);

    function updateSectionMetrics() {
        sectionNavMap.forEach((item) => {
            item.top = item.element.offsetTop - 130;
            item.height = item.element.offsetHeight;
        });
    }

    updateSectionMetrics();
    window.addEventListener('resize', () => {
        requestAnimationFrame(updateSectionMetrics);
    }, { passive: true });

    let isTicking = false;

    function onScroll() {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        // Active link in navbar
        for (let i = 0; i < sectionNavMap.length; i++) {
            const item = sectionNavMap[i];
            if (scrollY > item.top && scrollY <= item.top + item.height) {
                item.navLink.classList.add('active-link');
            } else {
                item.navLink.classList.remove('active-link');
            }
        }

        // Show/Hide Scroll to top button
        if (scrollUpBtn) {
            if (scrollY >= 400) {
                scrollUpBtn.classList.add('show-scroll');
            } else {
                scrollUpBtn.classList.remove('show-scroll');
            }
        }

        isTicking = false;
    }

    window.addEventListener('scroll', () => {
        if (!isTicking) {
            requestAnimationFrame(onScroll);
            isTicking = true;
        }
    }, { passive: true });

    if (scrollUpBtn) {
        scrollUpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

/*==================== QUALIFICATION TABS ====================*/
function initQualificationTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetSelector = btn.getAttribute('data-tab');
            const targetPane = document.querySelector(targetSelector);

            tabBtns.forEach((b) => b.classList.remove('active'));
            tabPanes.forEach((p) => p.classList.remove('active'));

            btn.classList.add('active');
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
}

/*==================== PROJECTS TOOLBAR (FILTER & SEARCH & PAGINATION) ====================*/
function initProjectToolbar() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('project-search');
    const projectCards = Array.from(document.querySelectorAll('.project-card'));
    const noResultsMsg = document.getElementById('no-results-msg');
    const paginationContainer = document.getElementById('project-pagination');
    const paginationPages = document.getElementById('pagination-pages');
    const prevBtn = document.getElementById('pagination-prev');
    const nextBtn = document.getElementById('pagination-next');
    const statusEl = document.getElementById('pagination-status');

    const ITEMS_PER_PAGE = 6;
    const initialActive = document.querySelector('.filter-btn.active');
    let currentFilter = initialActive ? initialActive.getAttribute('data-filter') : 'tool';
    let currentQuery = '';
    let currentPage = 1;

    function getMatchingCards() {
        return projectCards.filter((card) => {
            const cardCat = card.getAttribute('data-category');
            const cardTitle = card.querySelector('.project-title')?.textContent.toLowerCase() || '';
            const cardDesc = card.querySelector('.project-desc')?.textContent.toLowerCase() || '';

            // If searching with query, search across all projects; otherwise filter by active category tab
            const matchesCategory = currentQuery ? true : (cardCat === currentFilter);
            const matchesQuery = (cardTitle.includes(currentQuery) || cardDesc.includes(currentQuery));

            return matchesCategory && matchesQuery;
        });
    }

    function renderPage(page, shouldScroll = false) {
        const matchingCards = getMatchingCards();
        const totalItems = matchingCards.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        currentPage = page;

        // Hide all cards first
        projectCards.forEach((card) => {
            card.style.display = 'none';
        });

        // Show cards for current page
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageCards = matchingCards.slice(startIndex, endIndex);

        pageCards.forEach((card) => {
            card.style.display = 'flex';
        });

        // No results message
        if (noResultsMsg) {
            noResultsMsg.style.display = (totalItems === 0) ? 'block' : 'none';
        }

        // Render pagination controls
        renderPaginationControls(totalPages, totalItems);

        // Smooth scroll to top of section if page changed by user click
        if (shouldScroll) {
            const projectSection = document.getElementById('Project');
            if (projectSection) {
                const navHeight = 90;
                const targetY = projectSection.getBoundingClientRect().top + window.pageYOffset - navHeight;
                window.scrollTo({ top: targetY, behavior: 'smooth' });
            }
        }
    }

    function renderPaginationControls(totalPages, totalItems) {
        if (!paginationContainer) return;

        if (totalItems <= ITEMS_PER_PAGE) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        if (prevBtn) {
            prevBtn.disabled = (currentPage <= 1);
        }
        if (nextBtn) {
            nextBtn.disabled = (currentPage >= totalPages);
        }

        if (statusEl) {
            statusEl.textContent = `Trang ${currentPage} / ${totalPages} (${totalItems} ứng dụng)`;
        }

        if (paginationPages) {
            paginationPages.innerHTML = '';
            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.className = `page-num ${i === currentPage ? 'active' : ''}`;
                btn.textContent = i;
                btn.setAttribute('aria-label', `Trang ${i}`);
                btn.addEventListener('click', () => {
                    if (i !== currentPage) {
                        renderPage(i, true);
                    }
                });
                paginationPages.appendChild(btn);
            }
        }
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                renderPage(currentPage - 1, true);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const matchingCards = getMatchingCards();
            const totalPages = Math.ceil(matchingCards.length / ITEMS_PER_PAGE) || 1;
            if (currentPage < totalPages) {
                renderPage(currentPage + 1, true);
            }
        });
    }

    filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            filterBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            if (searchInput && searchInput.value) {
                searchInput.value = '';
                currentQuery = '';
            }
            renderPage(1, false);
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentQuery = e.target.value.toLowerCase().trim();
            renderPage(1, false);
        });
    }

    // Initial render on page load
    renderPage(1, false);
}

/*==================== COPY BANK NUMBER TOAST ====================*/
window.copyBankNumber = function(accountNumber) {
    if (!accountNumber) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(accountNumber).then(() => {
            showToast('Đã sao chép số tài khoản: ' + accountNumber);
        }).catch(() => {
            fallbackCopyText(accountNumber);
        });
    } else {
        fallbackCopyText(accountNumber);
    }
};

function fallbackCopyText(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
        document.execCommand('copy');
        showToast('Đã sao chép số tài khoản: ' + text);
    } catch (err) {
        alert('Số tài khoản của bạn: ' + text);
    }
    document.body.removeChild(tempInput);
}

function showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        const container = document.createElement('div');
        container.className = 'toast-container';
        container.innerHTML = `<div class="toast" id="app-toast"><i class="uil uil-check-circle"></i> <span id="toast-msg"></span></div>`;
        document.body.appendChild(container);
        toast = document.getElementById('app-toast');
    }

    const toastMsg = document.getElementById('toast-msg');
    if (toastMsg) toastMsg.textContent = message;

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

/*==================== CERTIFICATE LIGHTBOX ====================*/
function initCertLightbox() {
    const certCards = document.querySelectorAll('.cert-card');
    const lightbox = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');

    if (!lightbox || !lightboxImg) return;
    let triggerCard = null;

    certCards.forEach((card) => {
        card.addEventListener('click', () => {
            const img = card.querySelector('img');
            const title = card.querySelector('.cert-title')?.textContent || '';
            const issuer = card.querySelector('.cert-issuer')?.textContent || '';

            if (img) {
                triggerCard = card;
                lightboxImg.src = img.dataset.fullSrc || img.src;
                lightboxImg.alt = title;
                if (lightboxCaption) {
                    lightboxCaption.textContent = `${title} (${issuer})`;
                }
                lightbox.inert = false;
                lightbox.setAttribute('aria-hidden', 'false');
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
                lightboxClose?.focus();
            }
        });
    });

    function closeLightbox() {
        lightbox.classList.remove('active');
        lightbox.inert = true;
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        lightboxImg.removeAttribute('src');
        triggerCard?.focus();
    }

    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
        if (e.key === 'Tab' && lightbox.classList.contains('active')) {
            e.preventDefault();
            lightboxClose?.focus();
        }
    });
}

/*==================== CONTACT FORM SUBMISSION ====================*/
function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    const submitBtn = document.getElementById('contact-submit-btn');
    const alertBox = document.getElementById('contact-alert');

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwhoBwBvunUxUZmhGtQEicOOSiCHdMh6X06BGqI-KYLUm-tE7H8eBMtFgGdIH5SbXug/exec';

    // Đảm bảo trạng thái ban đầu sạch sẽ
    setLoading(false);

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Ẩn alert cũ nếu có
        if (alertBox) {
            alertBox.className = 'contact__alert';
            alertBox.textContent = '';
            alertBox.style.display = 'none';
        }

        const nameInput = document.getElementById('contact-name');
        const emailInput = document.getElementById('contact-email');
        const phoneInput = document.getElementById('contact-phone');
        const subjectInput = document.getElementById('contact-subject');
        const messageInput = document.getElementById('contact-message');

        const name = nameInput ? nameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const subject = subjectInput ? subjectInput.value.trim() : '';
        const message = messageInput ? messageInput.value.trim() : '';

        // Validation phía client
        if (!name) {
            showAlert('Vui lòng nhập họ và tên của bạn.', 'error');
            nameInput?.focus();
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            showAlert('Vui lòng nhập địa chỉ Email hợp lệ (ví dụ: name@example.com).', 'error');
            emailInput?.focus();
            return;
        }

        if (!message) {
            showAlert('Vui lòng nhập nội dung lời nhắn.', 'error');
            messageInput?.focus();
            return;
        }

        // Bật trạng thái Loading
        setLoading(true);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        try {
            const payload = {
                action: 'contact',
                name: name,
                email: email,
                phone: phone,
                subject: subject,
                message: message
            };

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const result = await response.json();

            if (result && result.status === 'success') {
                showAlert('🎉 Tin nhắn của bạn đã được gửi thành công đến Gmail của Ngọc Dũng! Tôi sẽ phản hồi sớm nhất.', 'success');
                contactForm.reset();
            } else {
                const errMsg = (result && result.message) ? result.message : 'Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại!';
                showAlert('⚠️ ' + errMsg, 'error');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Lỗi khi gửi form liên hệ:', error);
            if (error.name === 'AbortError') {
                showAlert('⚠️ Quá thời gian phản hồi (timeout). Vui lòng thử lại hoặc nhắn tin trực tiếp qua Zalo / Email!', 'error');
            } else {
                showAlert('⚠️ Không thể kết nối tới máy chủ gửi mail. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau!', 'error');
            }
        } finally {
            setLoading(false);
        }
    });

    function showAlert(msg, type) {
        if (!alertBox) return;
        alertBox.textContent = msg;
        alertBox.className = `contact__alert ${type}`;
        alertBox.style.display = 'block';
    }

    function setLoading(isLoading) {
        if (!submitBtn) return;
        submitBtn.disabled = isLoading;
        if (isLoading) {
            submitBtn.classList.add('is-loading');
        } else {
            submitBtn.classList.remove('is-loading');
        }
    }
}

/*==================== SERVICE WORKER ====================*/
function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/serviceWorker.js')
                .then((reg) => {
                    console.log('Service Worker Registered successfully:', reg.scope);
                })
                .catch((err) => {
                    console.log('Service Worker registration failed:', err);
                });
        });
    }
}
