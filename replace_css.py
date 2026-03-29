with open("public/index.html", "r", encoding="utf-8") as f:
    content = f.read()

old_style_start = content.index("  <style>")
old_style_end = content.index("  </style>") + len("  </style>")

new_css = '''  <style>
    :root {
      --sidebar-width: 240px;
      --primary:       #0059D6;
      --primary-dark:  #003087;
      --primary-light: rgba(0,89,214,.15);
      --bg-main:       #06080F;
      --bg-sidebar:    #0C1225;
      --bg-card:       #0F1A30;
      --bg-card2:      #111E38;
      --bg-topbar:     #0C1225;
      --border:        rgba(255,255,255,.08);
      --text-primary:  #E8EDF5;
      --text-secondary:#7A8EAD;
      --text-muted:    #4A5D7A;
    }
    * { box-sizing: border-box; }
    body { background: var(--bg-main); font-family: "Segoe UI","Apple SD Gothic Neo",sans-serif; color: var(--text-primary); }

    /* 로그인 */
    #loginSection { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg-main); position:relative; overflow:hidden; }
    #globeCanvas { position:absolute; inset:0; width:100%; height:100%; opacity:.4; pointer-events:none; }
    .login-wrap { position:relative; z-index:10; display:flex; align-items:center; justify-content:center; gap:5rem; width:100%; max-width:960px; padding:2rem; }
    .login-hero { flex:1; max-width:440px; color:#fff; }
    .login-hero-tag { display:inline-flex; align-items:center; gap:.4rem; font-size:.72rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--primary); border:1px solid rgba(0,89,214,.4); border-radius:2rem; padding:.35rem .9rem; margin-bottom:1.5rem; }
    .login-hero h1 { font-size:clamp(2.2rem,5vw,3.4rem); font-weight:800; line-height:1.15; letter-spacing:-.03em; margin-bottom:1rem; color:#fff; }
    .login-hero p { font-size:.92rem; color:var(--text-secondary); line-height:1.7; }
    .login-hero-pills { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1.8rem; }
    .login-hero-pills span { font-size:.68rem; font-weight:600; letter-spacing:.08em; text-transform:uppercase; border:1px solid rgba(255,255,255,.18); border-radius:2rem; padding:.28rem .75rem; color:rgba(255,255,255,.5); }
    .login-card { flex-shrink:0; width:100%; max-width:400px; background:var(--bg-card); border:1px solid var(--border); border-radius:1.25rem; padding:2rem 1.8rem; box-shadow:0 30px 80px rgba(0,0,0,.6); }
    .login-logo img { height:44px; object-fit:contain; }
    .login-card h4 { color:var(--text-primary); font-weight:700; }
    .login-card p { color:var(--text-secondary); }
    .login-card .form-label { color:var(--text-secondary); font-size:.82rem; }
    .login-card .form-control,.login-card .input-group-text { background:var(--bg-main); border-color:var(--border); color:var(--text-primary); }
    .login-card .form-control:focus { background:var(--bg-main); border-color:var(--primary); color:var(--text-primary); box-shadow:0 0 0 3px rgba(0,89,214,.2); }
    .login-card .form-control::placeholder { color:var(--text-muted); }
    .login-card .input-group-text { color:var(--text-secondary); }
    .login-card .nav-pills .nav-link { color:var(--text-secondary); background:transparent; }
    .login-card .nav-pills .nav-link.active { background:var(--primary); color:#fff; }
    .login-card .btn-primary { background:var(--primary); border-color:var(--primary); font-weight:600; }
    .login-card .btn-primary:hover { background:var(--primary-dark); border-color:var(--primary-dark); }
    @media (max-width:768px) {
      .login-wrap { flex-direction:column; gap:2rem; }
      .login-hero { text-align:center; }
      .login-hero-pills { justify-content:center; }
    }

    /* 앱 */
    #appSection { display:none; min-height:100vh; }
    #sidebar { width:var(--sidebar-width); min-height:100vh; background:var(--bg-sidebar); border-right:1px solid var(--border); position:fixed; top:0; left:0; z-index:1000; transition:transform .3s ease; }
    #sidebar .brand { padding:1.4rem 1.25rem 1rem; border-bottom:1px solid var(--border); }
    #sidebar .brand-title { font-size:.95rem; font-weight:700; color:var(--text-primary); line-height:1.3; }
    #sidebar .brand-sub { font-size:.7rem; color:var(--text-muted); margin-top:.15rem; }
    #sidebar .nav-link { color:var(--text-secondary); padding:.58rem 1.1rem; border-radius:.6rem; margin:.1rem .75rem; font-size:.85rem; display:flex; align-items:center; gap:.5rem; transition:background .2s,color .2s; }
    #sidebar .nav-link:hover { background:rgba(255,255,255,.05); color:var(--text-primary); }
    #sidebar .nav-link.active { background:var(--primary-light); color:var(--primary); }
    #sidebar .nav-link i { font-size:1rem; }
    #sidebar .sidebar-footer { padding:1rem 1.25rem; border-top:1px solid var(--border); color:var(--text-muted); font-size:.75rem; }
    #mainContent { margin-left:var(--sidebar-width); min-height:100vh; display:flex; flex-direction:column; }
    #topbar { background:var(--bg-topbar); border-bottom:1px solid var(--border); padding:.7rem 1.5rem; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:900; }
    #topbar .btn,#topbar button { color:var(--text-secondary); background:transparent; border:1px solid var(--border); border-radius:.5rem; font-size:.82rem; }
    #topbar .btn:hover,#topbar button:hover { color:var(--text-primary); background:rgba(255,255,255,.06); }
    .page-content { padding:1.75rem 1.5rem; flex:1; }

    /* 카드 */
    .cop-card { background:var(--bg-card); border:1px solid var(--border); border-radius:1rem; box-shadow:0 4px 24px rgba(0,0,0,.3); padding:1.4rem; height:100%; }
    .cop-card-title { font-size:.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.08em; margin-bottom:.6rem; }

    /* 히어로 배너 */
    .hero-banner { background:linear-gradient(135deg,#003087 0%,#0059D6 60%,#1A7AFF 100%); border-radius:1.25rem; padding:2rem 2rem 1.5rem; color:#fff; position:relative; overflow:hidden; margin-bottom:1.5rem; border:1px solid rgba(0,89,214,.3); }
    .hero-banner::before { content:""; position:absolute; top:-50px; right:-50px; width:220px; height:220px; background:rgba(255,255,255,.06); border-radius:50%; }
    .hero-banner::after { content:""; position:absolute; bottom:-70px; right:70px; width:160px; height:160px; background:rgba(255,255,255,.04); border-radius:50%; }
    .hero-greeting { font-size:1.4rem; font-weight:700; }
    .hero-sub { font-size:.88rem; opacity:.75; }
    .dday-box { background:rgba(255,255,255,.12); border:1.5px solid rgba(255,255,255,.25); border-radius:1rem; padding:.8rem 1.2rem; text-align:center; min-width:120px; backdrop-filter:blur(6px); position:relative; z-index:1; }
    .dday-num { font-size:2.2rem; font-weight:900; line-height:1; letter-spacing:-2px; }
    .dday-label { font-size:.72rem; opacity:.85; margin-top:.2rem; font-weight:500; }
    .dday-action { margin-top:.6rem; }
    @media (max-width:767px) {
      .dday-box { width:100%; min-width:unset; padding:.7rem 1rem; display:flex; align-items:center; gap:.75rem; text-align:left; border-radius:.9rem; }
      .dday-box .dday-title-label { display:none; }
      .dday-box .dday-num { font-size:2rem; margin:0; }
      .dday-box .dday-action { margin-top:0; margin-left:auto; flex-shrink:0; }
      .dday-box .dday-action .btn { padding:.35rem .8rem; font-size:.78rem; }
    }

    /* 바로가기 */
    .shortcut-btn { background:var(--bg-card); border:1px solid var(--border); border-radius:.9rem; padding:1rem .75rem; text-align:center; cursor:pointer; transition:all .2s; text-decoration:none; color:var(--text-secondary); display:block; }
    .shortcut-btn:hover { border-color:var(--primary); background:var(--primary-light); transform:translateY(-2px); box-shadow:0 4px 20px rgba(0,89,214,.2); color:var(--primary); }
    .shortcut-icon { width:44px; height:44px; border-radius:.75rem; display:flex; align-items:center; justify-content:center; font-size:1.2rem; margin:0 auto .5rem; }
    .shortcut-label { font-size:.8rem; font-weight:600; }

    /* stat */
    .stat-card { border-radius:1rem; border:1px solid var(--border); background:var(--bg-card); }
    .stat-icon { width:52px; height:52px; border-radius:.75rem; display:flex; align-items:center; justify-content:center; font-size:1.4rem; }

    /* 출석 링 */
    .my-attend-ring { width:72px; height:72px; border-radius:50%; background:conic-gradient(var(--primary) var(--pct),rgba(255,255,255,.1) 0); display:flex; align-items:center; justify-content:center; }
    .my-attend-inner { width:54px; height:54px; border-radius:50%; background:var(--bg-card); }

    /* 배지 */
    .badge-attend { background:rgba(34,197,94,.15); color:#4ade80; }
    .badge-absent { background:rgba(239,68,68,.15); color:#f87171; }

    /* 점심 */
    .vote-bar { height:6px; border-radius:3px; background:rgba(0,89,214,.5); }
    .menu-item { border-radius:.75rem; border:1.5px solid var(--border); transition:all .2s; cursor:pointer; background:var(--bg-card2); color:var(--text-primary); }
    .menu-item:hover,.menu-item.voted { border-color:var(--primary); background:var(--primary-light); color:var(--primary); }

    /* 게시판 */
    .board-row { border-bottom:1px solid var(--border); padding:.65rem 0; }
    .board-row:last-child { border-bottom:none; }
    .board-row a,.board-row .text-dark { color:var(--text-primary) !important; }
    .board-row .text-muted { color:var(--text-muted) !important; }

    /* 팝업 */
    #noticeOverlay { position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:2000; display:flex; align-items:center; justify-content:center; }
    .notice-popup { background:var(--bg-card); border:1px solid var(--border); border-radius:1.25rem; width:100%; max-width:500px; box-shadow:0 30px 80px rgba(0,0,0,.7); overflow:hidden; }
    .notice-popup .popup-header { background:linear-gradient(135deg,var(--primary-dark),var(--primary)); color:#fff; padding:1.25rem 1.5rem; display:flex; align-items:center; justify-content:space-between; }

    /* 모바일 */
    @media (max-width:991px) {
      #sidebar { transform:translateX(-100%); }
      #sidebar.open { transform:translateX(0); }
      #mainContent { margin-left:0; }
      #sidebarOverlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:999; }
      #sidebarOverlay.show { display:block; }
    }

    /* 폼 */
    .form-control,.form-select { background:var(--bg-main); border-color:var(--border); color:var(--text-primary); }
    .form-control:focus,.form-select:focus { background:var(--bg-main); border-color:var(--primary); color:var(--text-primary); box-shadow:0 0 0 3px rgba(0,89,214,.2); }
    .form-control::placeholder { color:var(--text-muted); }
    .form-label { color:var(--text-secondary); font-size:.84rem; }
    .input-group-text { background:var(--bg-card2); border-color:var(--border); color:var(--text-secondary); }
    #registerTab .form-label { font-size:.85rem; }
    .progress { height:6px; border-radius:3px; background:rgba(255,255,255,.08); }
    .progress-bar { background:var(--primary); }
    .page-header { margin-bottom:1.5rem; }
    .page-header h5 { font-weight:700; color:var(--text-primary); margin-bottom:.15rem; }
    .page-header p { font-size:.85rem; color:var(--text-secondary); margin:0; }
    .comment-box { background:var(--bg-card2); border:1px solid var(--border); border-radius:.75rem; padding:.85rem 1rem; margin-bottom:.6rem; }
    .comment-box.sub { background:rgba(0,89,214,.08); margin-left:1.5rem; }
    .modal-backdrop-custom { position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:1050; display:flex; align-items:center; justify-content:center; }
    .modal-box { background:var(--bg-card); border:1px solid var(--border); border-radius:1rem; padding:1.5rem; width:100%; max-width:520px; box-shadow:0 30px 80px rgba(0,0,0,.6); margin:1rem; color:var(--text-primary); }

    /* Bootstrap 오버라이드 */
    .text-muted { color:var(--text-secondary) !important; }
    .text-dark { color:var(--text-primary) !important; }
    .card { background:var(--bg-card); border-color:var(--border); color:var(--text-primary); }
    .table { color:var(--text-primary); }
    .table > :not(caption) > * > * { border-color:var(--border); }
    .table-hover tbody tr:hover { background:rgba(255,255,255,.04); }
    .badge.bg-light { background:rgba(255,255,255,.1) !important; color:var(--text-secondary) !important; }
    .badge.bg-primary { background:var(--primary) !important; }
    .badge.bg-success { background:rgba(34,197,94,.2) !important; color:#4ade80 !important; }
    .badge.bg-danger { background:rgba(239,68,68,.2) !important; color:#f87171 !important; }
    .badge.bg-warning { background:rgba(234,179,8,.2) !important; color:#fbbf24 !important; }
    .badge.bg-secondary { background:rgba(255,255,255,.08) !important; color:var(--text-secondary) !important; }
    .btn-outline-primary { color:var(--primary); border-color:var(--primary); }
    .btn-outline-primary:hover { background:var(--primary); color:#fff; }
    .btn-outline-secondary { color:var(--text-secondary); border-color:var(--border); }
    .btn-outline-secondary:hover { background:rgba(255,255,255,.06); color:var(--text-primary); border-color:var(--border); }
    .btn-primary { background:var(--primary); border-color:var(--primary); }
    .btn-primary:hover { background:var(--primary-dark); border-color:var(--primary-dark); }
    .dropdown-menu { background:var(--bg-card); border-color:var(--border); }
    .dropdown-item { color:var(--text-primary); }
    .dropdown-item:hover { background:rgba(255,255,255,.06); }
    .list-group-item { background:var(--bg-card2); border-color:var(--border); color:var(--text-primary); }
    .alert-danger { background:rgba(239,68,68,.1); border-color:rgba(239,68,68,.3); color:#f87171; }
    .alert-success { background:rgba(34,197,94,.1); border-color:rgba(34,197,94,.3); color:#4ade80; }
    .alert-info { background:rgba(0,89,214,.1); border-color:rgba(0,89,214,.3); color:#60a5fa; }
    .modal-content { background:var(--bg-card); border-color:var(--border); color:var(--text-primary); }
    .modal-header { border-color:var(--border); }
    .modal-footer { border-color:var(--border); }

    /* AI 도우미 */
    .ai-fab { position:fixed; bottom:2rem; right:2rem; z-index:9990; width:46px; height:46px; border-radius:50%; background:linear-gradient(135deg,#003087 0%,#0059D6 100%); box-shadow:0 4px 18px rgba(0,89,214,.5); color:#fff; font-size:1.15rem; display:flex; align-items:center; justify-content:center; text-decoration:none; transition:transform .2s ease,box-shadow .2s ease; animation:aiFabPulse 3s ease-in-out infinite; }
    .ai-fab:hover { color:#fff; transform:scale(1.12) translateY(-2px); box-shadow:0 8px 28px rgba(0,89,214,.7); animation:none; }
    @keyframes aiFabPulse {
      0%,100% { box-shadow:0 4px 18px rgba(0,89,214,.4); }
      50% { box-shadow:0 4px 22px rgba(0,89,214,.7),0 0 0 8px rgba(0,89,214,.08); }
    }
    @media (max-width:767px) { .ai-fab { bottom:1.25rem; right:1.25rem; width:42px; height:42px; font-size:1rem; } }
  </style>'''

new_content = content[:old_style_start] + new_css + content[old_style_end:]

with open("public/index.html", "w", encoding="utf-8") as f:
    f.write(new_content)

print("CSS 교체 완료")
