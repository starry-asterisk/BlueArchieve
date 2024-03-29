let author_uid;

window.addEventListener('scroll', () => input_categories.style.marginTop = `${document.body.parentNode.scrollTop}px`);

window.addEventListener('load', function () {
    init_componentList();
    init_timestamp();
});

function init_timestamp() {
    let date = new Date();
    date.setHours(date.getHours() - (date.getTimezoneOffset() / 60));
    main__header__timestamp.value = date.toISOString().split('.')[0];
}

function init_componentList() {
    let component_list = document.querySelector('.component_list');
    for (let specname in COMPONENT_SPEC) {
        let spec = COMPONENT_SPEC[specname];
        if (spec.title == undefined) continue;
        let li = createElement('li', {
            attrs: {
                type: specname,
                draggable: true
            },
            innerHTML: spec.title
        });

        let add_btn = createElement('button', {
            attrs: {
                class: 'mdi mdi-plus'
            }, on: {
                click: () => {
                    main__contents.append(createComponent(specname));
                }
            }
        });
        li.ondragstart = dragstart;
        li.append(add_btn);
        component_list.append(li);
    }
}

async function loadBoardSuggest() {
    if (typeof input_menu != 'undefined') {
        input_menu.querySelector('.input_suggest').innerHTML = '';
        if (SuggestList['board'] == undefined || SuggestList['board'].length < 1) SuggestList['board'] = (await firebase.board.list()).docs.map(doc => doc.data());
        for (let data of board2Path(SuggestList['board'])) addSuggest(data, input_menu);

        let li = createElement('li', { innerHTML: '+ 새로운 메뉴 추가', styles: { background: 'var(--accent-half)', cursor: 'pointer' } });
        li.onmousedown = () => modal('addMenu');
        input_menu.querySelector('.input_suggest').append(li);
    }
}

async function loadCategorySuggest() {
    if (typeof input_categories != 'undefined') {
        input_categories.querySelector('.input_suggest').innerHTML = '';
        if (SuggestList['category'] == undefined || SuggestList['category'].length < 1) SuggestList['category'] = (await firebase.categories.list()).docs.map(doc => doc.data());
        for (let data of SuggestList['category']) addSuggest(data, input_categories);

        let li = createElement('li', { innerHTML: '+ 새로운 카테고리 추가', styles: { background: 'var(--accent-half)', cursor: 'pointer' } });
        li.onmousedown = () => modal('addCategory');
        input_categories.querySelector('.input_suggest').append(li);
    }
}

async function firebaseLoadCallback() {
    firebase.auth.check(user => { author_uid = author_uid || user.uid }, () => {
        alert('비 정상적 접근입니다. 로그인을 먼저 진행해 주세요.');
        location.href = ROOT_PATH;
        return;
    });

    loading(0);
    await loadBoardSuggest();
    loading(0.15);
    await loadCategorySuggest();
    loading(0.3);

    if (post_id) {
        document.querySelector('aside').append(createElement('button', {
            attrs: { class: 'danger' },
            on: { click: e => { remove(e.target) } },
            innerHTML: '삭제하기'
        }));

        let data = (await firebase.post.selectOne(post_id)).data();
        loading(0.6);

        if (data == undefined) return NetErrorHandler(404);

        document.title = `${PAGE_PREFIX}문서 수정 - ${data.title}`;

        buildForm(data);
        loading(0.75);
    }

    let { next } = firebase.post.list({ board_name: 'template' }, true);
    next().then(docs => {
        for (let doc of docs) {
            let data = doc.data();
            let li = createElement('li', { attrs: { value: data.title } });
            li.onmousedown = () => {
                li.parentNode.previousElementSibling.value = data.title;
                buildForm(data);
                post_menu.value = '';
            }
            input_template.querySelector('.input_suggest').append(li);
        }
        loading(1);
    }).catch(firebaseErrorHandler);
}
function buildForm(data) {
    let {
        title,
        board_name,
        category,
        timestamp,
        contents,
        author
    } = data;

    author_uid = author || author_uid;

    main__header__title.value = title;
    main__header__timestamp.value = new Date(1000 * timestamp.seconds + (1000 * 60 * 60 * 9)).toISOString().split('.')[0];
    post_categories.value = category;
    post_menu.value = board_name;

    for (let content of contents) {
        if (typeof content.value == 'string') {
            content.value = { value: content.value };
        }
        main__contents.append(createComponent(content.type, content.value));
    }
}

function drop(e) {
    e.preventDefault();
    let files = e.dataTransfer.files || e.dataTransfer.items;
    if (files.length > 0) return dropfile(files);
    let type = e.dataTransfer.getData('component');
    if (type == undefined || type.startsWith('c_')) return;

    main__contents.append(createComponent(type));
}

function dropfile(files) {
    [...files].forEach((file) => {
        let type = file.type.split('/')[0];
        switch (type) {
            case 'image':
            case 'video':
            case 'audio':
                main__contents.append(createComponent(type, { file }));
                break;
            default:
                dev.warn('no support type :', type);
                alert('지원하지 않는 파일형식 이거나 폴더 입니다');
                break;
        }
    });
}
function dragover(e) {
    e.preventDefault();
}
function dragstart(e) {
    e.dataTransfer.setData("component", e.target.getAttribute('type'));
}

function createComponent(type, option = {}) {

    let id = 'c_' + Math.floor(Math.random() * 1000000).toString(16);
    option.id = id;

    let spec = COMPONENT_SPEC[type];

    let component = createElement('div', { attrs: { class: `component ${type}`, draggable: true, id } });

    let title = createElement('p', { innerHTML: spec.title });
    component.append(title);

    let component__remove_btn = createElement('button', { attrs: { class: 'component__remove_btn mdi mdi-trash-can' } });
    component.append(component__remove_btn);

    component.append(spec.option(option));
    component.append(spec.input(option));

    component.ondragstart = (e) => {
        e.dataTransfer.setData("component", id);
        e.dataTransfer.setDragImage(component, e.offsetX, e.offsetY);
    }

    component.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        let _id = e.dataTransfer.getData('component');
        let target;
        let files = e.dataTransfer.files || e.dataTransfer.items;
        if (files.length > 0) return dropfile(files);
        if (_id == undefined) return;
        if (_id.startsWith('c_')) {
            target = document.getElementById(_id);
        } else {
            target = createComponent(_id);
        }
        if (component.getBoundingClientRect().height / 2 < e.offsetY) component.after(target);
        else component.before(target);
    }

    component__remove_btn.onclick = function () {
        component.remove();
    }

    return component;
}

function createOption(arr = []) {
    let div = createElement('div', { attrs: { class: 'component__option' } });
    let inputs = {};
    for (let option of arr) {
        let { label, text, type, name, value, attr, button } = option;
        if (label) {
            div.append(createElement('span', { attrs: { ...attr, class: 'component__option__label' }, innerHTML: label }));
        } else if (text) {
            div.append(document.createTextNode(text));
        } else if (button) {
            let btn = createElement('button', { attrs: { ...attr, class: `component__option__button ${button}` } });
            div.append(btn);
            inputs[button] = btn;
        } else {
            let inputContainer = createElement('div', { attrs: { class: `component__option__input ${name}` } });
            let input = createElement('input', { attrs: { ...attr, type }, value });
            inputContainer.append(input);
            div.append(inputContainer);
            inputs[name] = input;
        }
    }
    div.inputs = inputs;
    return div;
}

let lastSelection;
let lastCell;

const COMPONENT_SPEC = {
    textbox: {
        title: '텍스트 박스',
        option: createTextboxOpt,
        input: ({ value = '' }) => {
            return createElement('div', {
                attrs: { contenteditable: true, placeholder: '여기에 텍스트를 입력하세요' },
                on: {
                    ondragstart: e => {
                        e.preventDefault();
                        e.stopPropagation();
                    },
                    blur: () => {
                        let s = window.getSelection();
                        lastSelection = {
                            anchorNode: s.anchorNode,
                            anchorOffset: s.anchorOffset,
                            focusNode: s.focusNode,
                            focusOffset: s.focusOffset,
                        };
                    },
                    paste: e => {
                        e.preventDefault();
                        document.execCommand('inserttext', false, e.clipboardData.getData('text/plain'));
                    }
                },
                innerHTML: value
            });
        },
        getData: id => {
            return document.querySelector(`#${id} [contenteditable]`).innerHTML;
        }
    },
    image: {
        title: '이미지',
        option: option => COMPONENT_SPEC.default.option(option),
        input: ({ file, value }, mediaTytpe = 'image') => {
            let tagName = mediaTytpe == 'image' ? 'img' : mediaTytpe;
            let media, fragment = document.createDocumentFragment();
            let input = createElement('input', { attrs: { type: 'file', accept: `${mediaTytpe}/*` } });
            input.oninput = async (e, value) => {
                if (input.files && input.files[0]) {
                    if (media) media.remove();
                    media = createElement(tagName, { attrs: { controls: mediaTytpe != 'image', src: URL.createObjectURL(input.files[0]) } });
                    input.after(media);
                } else if (value) {
                    media = createElement(tagName, { attrs: { controls: mediaTytpe != 'image', src: value.startsWith('http') ? value : await firebase.storage.getUrl(value) } });
                    input.after(media);
                }
            }
            fragment.append(input);
            if (file) {
                let dataTranster = new DataTransfer();
                dataTranster.items.add(file);
                input.files = dataTranster.files;
                input.oninput();
            }
            if (value) {
                let inputHidden = createElement('input', { attrs: { type: 'hidden' }, value });
                input.after(inputHidden);
                input.oninput(undefined, value);
            }
            return fragment;
        },
        getData: async id => {
            let file = document.querySelector(`#${id} input[type="file"]`).files[0];
            let value = document.querySelector(`#${id} input[type="hidden"]`)?.value;
            if (file) {
                let fileName = `${id}/${file.name}`;
                if (FILE_UPLOAD_METHOD == 0 && `${file.type}`.startsWith('image')) {
                    let result = await uploadByImgur(file);
                    if (result.status === 200) {
                        fileName = result.data.link;
                    } else {
                        alert('Imgur사이트 파일 업로드에 실패했습니다.');
                        if (confirm('다시 시도하겠습니까?')) await firebase.storage.upload(fileName, file);
                    }
                } else {
                    await firebase.storage.upload(fileName, file);
                }
                return fileName;
            } else if (value) {
                return value;
            }
            else return 'undefined';
        }
    },
    audio: {
        title: '음악',
        option: option => COMPONENT_SPEC.default.option(option),
        input: option => COMPONENT_SPEC.image.input(option, 'audio'),
        getData: id => COMPONENT_SPEC.image.getData(id)
    },
    video: {
        title: '영상',
        option: option => COMPONENT_SPEC.default.option(option),
        input: option => COMPONENT_SPEC.image.input(option, 'video'),
        getData: id => COMPONENT_SPEC.image.getData(id)
    },
    table: {
        title: '도표',
        option: ({ id, rowcount, header, outerLineWidth = 1, outerLineColor = '#cccccc', innerLineColor = '#cccccc' }) => {
            let table, frag = document.createDocumentFragment();
            let option_1 = createOption([
                { label: '가로 x 세로 크기' },
                { name: 'col', type: 'number', value: header?.length || 3, attr: { min: 1 } },
                { text: 'x' },
                { name: 'row', type: 'number', value: rowcount || 3, attr: { min: 1 } }
            ]);

            function getTable() {
                if (table == undefined) table = document.querySelector(`#${id} editable-table`);
                return table;
            }

            option_1.inputs.col.oninput = function () {
                if (!this.validity.valid) return false;
                document.querySelector(`#${id} editable-table`).colcount = this.value;
            }

            option_1.inputs.row.oninput = function () {
                if (!this.validity.valid) return false;
                document.querySelector(`#${id} editable-table`).rowcount = this.value;
            }

            frag.append(option_1);

            let option_2 = createOption([
                { label: '외각선 색상' },
                { name: 'outer', type: 'color', value: outerLineColor },
                { label: '굵기' },
                { name: 'outer_width', type: 'number', value: outerLineWidth, attr: { min: 1, step: 1 } }
            ]);

            option_2.inputs.outer.oninput = function () {
                getTable().outerLineColor = this.value;
            }

            option_2.inputs.outer_width.oninput = function () {
                if (!this.validity.valid) return false;
                getTable().outerLineWidth = this.value;
            }

            frag.append(option_2);

            let option_3 = createOption([
                { label: '내부선' },
                { name: 'inner', type: 'color', value: innerLineColor }
            ]);

            option_3.inputs.inner.oninput = function () {
                getTable().innerLineColor = this.value;
            }

            frag.append(option_3);

            let option_4 = createOption([
                { label: '셀 체우기' },
                { name: 'cell', type: 'color', value: '#ffffff' },
                { label: '삽입' },
                { button: 'image' },
                { button: 'link' }
            ]);

            option_4.inputs.cell.oninput = function () {
                let _table = getTable();
                if (_table._lastCell == undefined) return;
                _table._lastCell.setStyles({ 'background-color': this.value });
                _table._lastCell._background = this.value;
            }

            option_4.inputs.image.onclick = () => {
                let _table = getTable();
                if (_table._lastCell == undefined) return alert('셀을 먼저 선택해 주세요.');
                modal('addImg', src => {
                    _table._lastCell.firstChild.append(document.createTextNode(`[image:${src}]`));
                });

            }
            option_4.inputs.link.onclick = () => {
                let _table = getTable();
                if (_table._lastCell == undefined) return alert('셀을 먼저 선택해 주세요.');
                let link = prompt('삽입할 링크를 입력해 주세요');
                if (link) _table._lastCell.firstChild.append(document.createTextNode(`[link:${link}]`));
            }

            frag.append(option_4);

            return frag;
        },
        input: ({ rowcount, header, cells, cellColors, outerLineWidth = 1, outerLineColor = '#cccccc', innerLineColor = '#cccccc', id }) => {
            let option_cell, div = createElement();
            let table = createElement('editable-table',
                { styles: { 'margin-top': '2rem' } },
                { rowcount: rowcount || 3, colcount: header?.length || 3 }
            );
            table.addEventListener('focusin', e => {
                table._lastCell = e.target.closest('.editable-table__cell:not(.header *)');
                option_cell = option_cell || document.querySelector(`#${id} .cell>input`);
                option_cell.value = rgb2hex(table._lastCell?._background) || '#ffffff';
            });
            if (cells) table.setData(cells);
            if (header) table.setHeader(header);
            if (cellColors) table.setCellColors(cellColors);
            table.outerLineWidth = outerLineWidth;
            table.outerLineColor = outerLineColor;
            table.innerLineColor = innerLineColor;
            div.append(table);
            return div;
        },
        getData: id => {
            let table = document.querySelector(`#${id} editable-table`);
            return {
                rowcount: table.rowcount,
                header: table.header,
                cells: table.data,
                innerLineColor: table.innerLineColor,
                outerLineColor: table.outerLineColor,
                outerLineWidth: table.outerLineWidth,
                cellColors: table.cellColors
            };
        }
    },
    title: {
        title: '소제목',
        option: ({ depth = 1 }) => {
            let option_1 = createOption([
                { label: '목차 깊이' },
                { name: 'depth', type: 'number', value: depth, attr: { min: 1, max: 6, step: 1 } }
            ]);
            option_1.setStyles({ 'margin-bottom': '2rem' });
            return option_1;
        },
        input: ({ text = '' }) => {
            return createElement('div', { attrs: { contenteditable: 'plaintext-only', placeholder: '여기에 텍스트를 입력하세요' }, innerHTML: text });
        },
        getData: id => {
            return { text: document.querySelector(`#${id} [contenteditable]`).innerHTML, depth: document.querySelector(`#${id} .depth>input`).value || 1 };
        }
    },
    seperator: {
        title: '구분선',
        option: option => COMPONENT_SPEC.default.option(option),
        input: option => COMPONENT_SPEC.default.input(option),
        getData: id => COMPONENT_SPEC.default.getData(id)
    },
    summury: {
        title: '목차',
        option: option => COMPONENT_SPEC.default.option(option),
        input: option => COMPONENT_SPEC.default.input(option),
        getData: id => COMPONENT_SPEC.default.getData(id)
    },
    caption: {
        title: '틀',
        option: option => COMPONENT_SPEC.default.option(option),
        input: option => COMPONENT_SPEC.default.input(option),
        getData: id => COMPONENT_SPEC.default.getData(id)
    },
    default: {
        option: () => {
            return document.createDocumentFragment();
        },
        input: () => {
            return document.createDocumentFragment();
        },
        getData: id => {
            return '';
        }
    }
}

var commands = [{
    cmd: "backColor",
    icon: "format-color-highlight",
    val: "#00ffff",
    input: "color",
    desc: "글씨에 형광펜 효과를 줍니다."
},
{},
{
    cmd: "bold",
    icon: "format-bold",
    desc: "굵은 글씨 효과"
},
{
    cmd: "italic",
    icon: "format-italic",
    desc: "기울임 꼴"
},
{
    cmd: "strikeThrough",
    icon: "format-strikethrough",
    desc: "취소선 효과"
},
{
    cmd: "underline",
    icon: "format-underline",
    desc: "밑줄 효과"
},
{},
{
    cmd: "fontSize",
    val: "20",
    input: "number",
    desc: "폰트 사이즈를 지정합니다. 기본값은 20px입니다."
},
{},
{
    cmd: "justifyLeft",
    icon: "format-align-left",
    desc: "좌측 정렬"
},
{
    cmd: "justifyCenter",
    icon: "format-align-center",
    desc: "가운데 정렬"
},
{
    cmd: "justifyRight",
    icon: "format-align-right",
    desc: "우측 정렬"
},
{},
{
    cmd: "formatBlock",
    icon: "format-quote-close",
    val: "<blockquote>",
    desc: "인용 하기"
},
{
    cmd: "createLink",
    icon: "link-variant",
    desc: "링크 생성",
    prompt: '생성할 링크를 입력해 주세요.',
    conv_fn: val => val.startsWith('http') ? val : 'http://' + val
},
{
    cmd: "insertImage",
    icon: "image-plus",
    modal: "addImg",
    desc: "링크 기반 이미지 삽입",
    conv_fn: val => val.startsWith('http') ? val : 'http://' + val
},
{
    cmd: "unlink",
    icon: "link-variant-off",
    desc: "링크 삭제"
},
{
    cmd: "removeFormat",
    icon: "format-clear",
    desc: "서식 지우기"
},
{
    cmd: "selectAll",
    icon: "select-all",
    desc: "전체 선택하기"
},
{
    cmd: "undo",
    icon: "undo",
    desc: "되돌리기"
},
{
    cmd: "redo",
    icon: "redo",
    desc: "다시하기"
}];

function createTextboxOpt() {
    let frag = createElement('div', { attrs: { class: 'component__execList' } });

    for (let command of commands) {
        let input;
        if (typeof command.cmd == "undefined") frag.append(createElement('span', { attrs: { class: 'separator' } }))
        if (!document.queryCommandSupported(command.cmd)) continue;
        if (typeof command.input !== "undefined") {
            switch (command.input) {
                case 'number':
                    input = createElement('input', {
                        attrs: {
                            title: command.desc,
                            type: 'number',
                            min: 12,
                            step: 1
                        },
                        on: {
                            change: e => {
                                if (e != undefined) {
                                    let selection = window.getSelection();
                                    let { anchorNode, anchorOffset, focusNode, focusOffset } = lastSelection;
                                    var range = document.createRange();
                                    range.setStart(anchorNode, anchorOffset);
                                    range.setEnd(focusNode, focusOffset);
                                    selection.removeAllRanges();
                                    selection.addRange(range);
                                }
                                document.execCommand("styleWithCSS", 0, true);
                                document.execCommand(command.cmd, false, "7");
                                for (let font of document.querySelectorAll('[style*="xxx-large"]')) {
                                    font.style.fontSize = `${input.value / 10}rem` || "2rem";
                                }
                            }
                        },
                        value: 20
                    });
                    let plusButton = createElement('button', {
                        attrs: {
                            title: command.desc,
                            class: `mdi mdi-plus-thick`
                        },
                        on: {
                            click: () => {
                                input.value = parseInt(input.value) + 1;
                                input.onchange();
                            }
                        }
                    });
                    let minusButton = createElement('button', {
                        attrs: {
                            title: command.desc,
                            class: `mdi mdi-minus-thick`
                        },
                        on: {
                            click: () => {
                                input.value = parseInt(input.value) - 1;
                                input.dispatchEvent(new Event('change'));
                            }
                        }
                    });
                    frag.append(plusButton);
                    frag.append(input);
                    frag.append(minusButton);
                    break;
                case 'color':
                    let label = createElement('label', { attrs: { class: 'mdi mdi-format-color-highlight input_color' } });
                    input = createElement('input', {
                        attrs: {
                            title: command.desc,
                            type: 'color'
                        },
                        on: {
                            input: () => {
                                document.execCommand("styleWithCSS", 0, true);
                                document.execCommand(command.cmd, false, input.value || command.val);
                            },
                            focus: () => {
                                document.execCommand("styleWithCSS", 0, true);
                                document.execCommand(command.cmd, false, input.value || command.val);
                            }
                        },
                        value: command.val
                    });
                    label.append(input);
                    frag.append(label);
                    break;
            }
        } else {
            frag.append(createElement('button', {
                attrs: {
                    title: command.desc,
                    class: `mdi mdi-${command.icon}`
                },
                on: {
                    click: () => {
                        val = command.val || "";
                        if (command.modal) {
                            return modal(command.modal, src => {
                                val = command.conv_fn(src);
                                document.execCommand("styleWithCSS", 0, true);
                                document.execCommand(command.cmd, false, val || "");
                            });
                        }
                        if (command.prompt) val = command.conv_fn(prompt(command.prompt));
                        document.execCommand("styleWithCSS", 0, true);
                        document.execCommand(command.cmd, false, val || "");
                    }
                }
            }));
        }
    }

    return frag;
}

function remove(button) {
    if (!confirm('정말로 삭제 하시겠습니까?')) return;
    button.setAttribute('disabled', true);
    firebase.post.deleteOne(post_id)
        .then(() => location.href = ROOT_PATH)
        .catch(firebaseErrorHandler);
}

async function submit(button) {
    if (!confirm('작성한 내용을 업로드 하시겠습니까?')) return;
    if (!validate(main__header__title)) return;
    if (!validate(post_categories)) return;
    if (!validate(post_menu)) return;
    button.setAttribute('disabled', true);
    let contents = [];
    for (let c of document.getElementsByClassName('component')) {
        contents.push({
            type: c.classList[1],
            value: await COMPONENT_SPEC[c.classList[1]].getData(c.getAttribute('id'))
        });
    }
    let data = {
        board_name: post_menu.value.split(' > ').pop(),
        board_name_arr: post_menu.value.split(' > '),
        category: post_categories.value,
        title: main__header__title.value,
        contents: contents,
        hidden: post_menu.value == 'template',
        use: true,
        timestamp: new Date(main__header__timestamp.value),
        author: author_uid
    };
    if (post_id) {
        data.updated_timestamp = new Date();
        firebase.post.updateOne(post_id, data)
            .then(() => {
                location.href = `${ROOT_PATH}?post=${post_id}`
            })
            .catch(firebaseErrorHandler);
    } else {
        firebase.post.insertOne(data)
            .then(ref => {
                if (ref == undefined) {
                    alert('권한이 없거나 자동 로그아웃 처리되었습니다. 다시 로그인 해주세요.');
                    location.href = ROOT_PATH;
                    return;
                }
                location.href = `${ROOT_PATH}?post=${ref.id}`;
            })
            .catch(e => {
                alert('ERROR::저장에 실패했습니다::');
                dev.error(e);
            });
    }

}