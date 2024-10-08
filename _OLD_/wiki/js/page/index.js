window.addEventListener('click', e => {
    let a_tag = e.target.closest(`a[href^="${ROOT_PATH}?"], a[href="${ROOT_PATH}"]`);
    if (a_tag && !e.ctrlKey) {
        e.preventDefault();
        href_move(a_tag.getAttribute('href'));
    }
});

function search({ key }) {
    if (key.toLowerCase() != 'enter') return;
    href_move(`${ROOT_PATH}?keyword=${search_input.value || ''}`);
}

function href_move(href) {
    history.pushState({}, '', href);
    updateContent(href);
}

async function updateContent(href) {
    loading(0);
    params = new URLSearchParams(href.split('?')[1]);
    post_id = params.get('post');
    document.querySelector('html').scrollTop = 0;
    if (post_id) {
        if (post_id == 'random') {
            if (waitRandom) return;
            waitRandom = true;
            loading(0.15);
            post_id = await firebase.search.random();
            history.replaceState({}, '', href.replace('post=random', `post=${post_id}`));
            loading(0.35);
            waitRandom = false;
        }
        await renderPost(post_id);
    } else await renderMain();
    loading(1);
}

window.addEventListener('popstate', function(){
    updateContent(location.pathname + location.search);
});

let renderMain, renderPost, timeout_timer, interval_timer, editButton, waitRandom;
function clearContents() {
    document.body.classList.remove('error');
    for (let el of Array.from(document.querySelectorAll('.main__document_info, .main__notice, body>.index, body>error'))) el.remove();
    if (editButton) editButton.remove();
    if (timeout_timer) clearTimeout(timeout_timer);
    if (interval_timer) clearInterval(interval_timer);
    main__contents.innerHTML = '';
}

async function firebaseLoadCallback() {
    loading(0);
    const { createVisited, createCategories, loadNotice, createProfile, createLoginForm, createList1, createList2, buildPost } = await import(`../util-post.js?timestamp=${new Date().getTime()}`);
    let main__header__toolbox = document.querySelector('.main__header__toolbox');
    renderMain = async function () {
        clearContents();
        createVisited();
        main__header__title.innerHTML = '네무위키:대문';
        main__header__timestamp.innerHTML = new Date().toLocaleString();
        timeout_timer = setTimeout(() => {
            interval_timer = setInterval(() => {
                main__header__timestamp.innerHTML = new Date().toLocaleString();
            }, 1000);
        }, 1000 - new Date().getMilliseconds());

        let keyword = params.get('keyword') || '';
        let field = params.get('field') || 'title_arr';
        let operator = params.get('operator') || 'contains';

        search_input.value = keyword;

        buildPost({
            contents: [
                {
                    type: 'seperator',
                },
                {
                    type: 'textbox',
                    value: '<div style="text-align: center;"><span style="font-family: var(--ff-contents); color: var(--clr-font); font-size: 3.8rem;">환영합니다!</span></div><div style="text-align: center;"><span style="font-weight: bold; font-size: 3.9rem; color: var(--clr-primary-base);">네무위키</span><span style="font-size: 3.8rem;">입니다</span></div><div style="text-align: center;">※ 정확하지 않은 내용이 있을 수있으며</div><div style="text-align: center;">현실의 인물, 단체, 사건과는 관련이 없습니다</div>'
                },
                {
                    type: 'seperator',
                },
                {
                    type: 'table',
                    value: {
                        cellColors: ["", ""],
                        cells: ["%{display:block;text-align:center}처음이라면\n[link:http://www.nemuwiki.com/wiki/?post=QFFrhNhkjXqDGnKXdiC8;사용_가이드]%", "%{display:block;text-align:center}익숙하다면\n[link:https://www.nemuwiki.com/wiki/profile;사용자_문서]%"],
                        header: [0, 0],
                        innerLineColor: 'var(--clr-primary-base)',
                        outerLineColor: 'transparent',
                        outerLineWidth: '1',
                        rowcount: 1,
                        isFullWidth: true
                    }
                },
            ]
        }, false);

        main__contents.append(createElement('div', { attrs: { class: 'content title', id: 'total', onclick: 'fold(this)' }, innerHTML: '전체 문서' }));
        main__contents.append(createElement('div', { attrs: { class: 'content title', id: 'people', onclick: 'fold(this)' }, innerHTML: '인물' }));

        for (let el of Array.from(document.querySelectorAll('.content.board_list_1'))) el.remove();
        await createList1(keyword, field, operator);
        loading(0.6);
        for (let el of Array.from(document.querySelectorAll('.content.board_list_2'))) el.remove();
        await createList2('인물', 'category', 'equal');
        loadNotice();

    }

    renderPost = async function (post_id) {
        clearContents();
        createVisited();
        let doc = await firebase.post.selectOne(post_id);
        let data = doc.data();
        loading(0.75);
        if (data == undefined) return NetErrorHandler(404);

        document.title = `${PAGE_PREFIX}${data.board_name} - ${data.title}`;

        let old_visited_index = visited.indexOf(`${post_id}:${data.title}:${data.board_name}`);
        if (old_visited_index > -1) visited.splice(old_visited_index, 1);
        visited.unshift(`${post_id}:${data.title}:${data.board_name}`);
        visited.splice(VISITED_MAX);
        localStorage.setItem('visited', visited);

        buildPost(data);
        editButton = createElement('button', {
            attrs: {
                class: 'edit'
            },
            innerHTML: '수정', on: {
                click: () => {
                    location.href = `${ROOT_PATH}form${SUFFIX}?post=${post_id}`;
                }
            }
        })
        main__header__toolbox.append(editButton);
    }

    loading(0.15);
    firebase.auth.check(user => {
        user_area.innerHTML = '';
        createProfile(user);
        document.body.classList.remove('non-auth');
    }, () => {
        user_area.innerHTML = '';
        createLoginForm();
        document.body.classList.add('non-auth');
    });

    SuggestList['board'] = (await firebase.board.list()).docs.map(doc => { return {...doc.data(), _id: doc.id}; });
    SuggestList['board2Path_1'] = board2Path(SuggestList['board'], 1);
    SuggestList['board2Path_2'] = board2Path(SuggestList['board'], 2);
    loading(0.25);
    createCategories();
    loading(0.45);

    if (post_id) {
        if (post_id == 'random') {
            post_id = await firebase.search.random();
            history.replaceState({}, '', `${ROOT_PATH}?post=${post_id}`);
        }
        await renderPost(post_id);
        document.body.classList.remove('loading');
    } else {
        document.body.classList.remove('loading');
        await renderMain();
    }
    loading(1);
}