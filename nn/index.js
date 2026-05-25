let localStorageLightMode = localStorage.getItem('lightMode');
let prefersColorScheme = window.matchMedia('(prefers-color-scheme: light)');
window.onload = () => {
    let indicators, sections;
    const pointer = document.createElement('div');
    pointer.classList.add('pointer');
    window.onmousemove = e => {
        pointer.style.top = `${e.pageY}px`;
        pointer.style.left = `${e.pageX}px`;
    };
    document.body.append(pointer);

    // Intersection Observer 옵션 설정
    const observerOptions = {
        root: null, // 브라우저 뷰포트 기준
        threshold: 0.7 // 섹션이 화면의 70% 이상 채워졌을 때 (스냅 안착 시점) 활성화
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 섹션이 화면에 완전히 들어오면 active 클래스 추가 -> CSS 딜레이 시작
                entry.target.classList.add('active');
            } else {
                // 화면에서 벗어나면 다시 초기화 (다시 스크롤해 올 때 또 애니메이션을 보고 싶다면 유지)
                entry.target.classList.remove('active');
            }
        });
    }, observerOptions);

    (sections = document.querySelectorAll('.main__section')).forEach(section => observer.observe(section));

    (indicators = document.querySelectorAll('.main__section__indicator')).forEach((indicator, index) => {
        indicator.style.setProperty('--y', `${50 - indicators.length * 2 + (index + 1) * 4}vh`);
        indicator.onclick = () => sections[index].scrollIntoView();
    });

    document.querySelectorAll('.main__section__scroll, .main__section__scroll2').forEach(scroll => scroll.onclick = e => {
        e.target.parentElement.nextElementSibling.scrollIntoView({ behavior: 'smooth' });
    });

    document.querySelectorAll('.timeline__node').forEach((node, index) => node.onclick = e => {
        document.querySelector('.timeline').scrollLeft = index * 220;
    });

    let last_t = 0, t, degree;
    [
        {
            url: './images/asset/3iheZrX.png',
            name: '아벨 그린필드',
            age: '13세',
            gender: 'M',
            description: '마법 아카데미 누르에 재학중인 학생이다. 스승은 이 이며 현재 3년째 수학중이다. 그린필드 부부의 아들로 태어난 아벨은 원래는 낮에는 목장에서 일하고 치즈커드와 꿀을 곁들여 먹는 평범한 사람이었겠으나 아카데미에 들어오며 그의 삶은 전환을 맞이하게 되었다.'
        },
        {
            url: './images/asset/9wNLAdS.jpg',
            name: '네므 (베타루트)',
            age: '17세',
            gender: 'F',
            description: '가설과 입증의 히포세, 이단과 구전의 그리모어, 공포와 경외의 포보스가 합작으로 진행한 인간의 "악마화" 실험에서 최초로 성공한 개체 이자 부산물. 그리고 새롭게 그녀의 자리를 이어받은, 자각과 각성의 악마, "꿈"의 개념을 담당하는 루시드라고도 말할 수 있겠다.'
        },
        {},
        {},
        {}
    ].forEach(info => {
        let main__section__infectee = (()=>{
            let el = document.createElement('div');
            el.classList.add('main__section__infectee','fix','interactive');
            return el;
        })();

        (()=>{
            let el = document.createElement('div');
            el.classList.add('main__section__infectee__frame','fix');
            el.style.setProperty('--url',`url(${info.url})`);
            main__section__infectee.appendChild(el);
            return el;
        })();
        
        main__section__infectee.onclick = () => {
            infecteeList.querySelector('.active')?.classList.remove('active');
            main__section__infectee?.classList.add('active');
            infecteeInfo.innerHTML = `
            <div class='main__section__infecteeInfo__wrap'>
                <div class='main__section__infecteeInfo__paperClip'></div>
                <h2 class='main__section__infecteeInfo__title'>환자기록지</h2>
                <hr class='main__section__infecteeInfo__hr'>
                <table class='main__section__infecteeInfo__table'>
                    <tr>
                        <th rowspan="2" width="136px"><div class='main__section__infecteeInfo__photo interactive' style='--url: url(${info.url})'></div></th>
                        <th width="80px">성명</th>
                        <td class="interactive">${info.name || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <th>연령</th>
                        <td class="interactive">${info.age || 'Unknown'} / ${info.gender || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <th height="100px">환자기록</th>
                        <td colspan="2" class="interactive">${info.description || ''}</td>
                    </tr>
                </table>
                <button class='main__section__infecteeInfo__close' onclick='infecteeInfo.innerHTML="";infecteeList.querySelector(".active")?.classList.remove("active");'></button>
            </div>
            `
        };
        
        degree = Math.round(Math.random() * 30);
        t = degree - 15;
        if (-1 < t * last_t) t = t * -1;
        last_t = t;
        main__section__infectee.style.transform = `rotate(${t}deg)`;
        main__section__infectee.style.zIndex = degree;

        infecteeList.appendChild(main__section__infectee);
    })

    let timer;
    document.querySelector('.toggleLightMode').onclick = () => {
        let bool = !document.body.classList.contains('light-mode');
        document.body.classList.add('mode-changing-before');
        document.body.classList.add('mode-changing');
        document.body.classList.toggle('light-mode', bool);
        document.body.classList.toggle('dark-mode', !bool);
        localStorage.setItem('lightMode', bool ? 'enabled' : 'disabled');
        prefersColorScheme.onchange = null;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            document.body.classList.remove('mode-changing');
            document.body.classList.remove('mode-changing-before');
        }, 500);
    };
    document.body.classList.remove('loading');
};

switch (localStorageLightMode) {
    case 'enabled':
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
        break;
    case 'disabled':
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        break;
    default:
        document.body.classList.toggle('light-mode', prefersColorScheme.matches);
        document.body.classList.toggle('dark-mode', !prefersColorScheme.matches);
        prefersColorScheme.onchange = e => document.body.classList.toggle('light-mode', prefersColorScheme.matches);
        break;
}

const factionDesc = [
    {
        title: '마더구스 구호단',
        quote: '비롯 거짓된 모습일 지언정, 저들에겐 진짜입니다. 저는 그것을 지켜주고 싶어요.',
        desc: '전세계에 걸쳐 활동하는 아동 구호단체, 성인청보다 인도주의적인 아동대우를 요구하며 그들에게도 평범한 유년기가 필요하다고 주장한다.'
    },
    {
        title: '암브로시아',
        quote: '거짓된 질서를 부순다. 그렇게 함으로써 새로운 미래를 열어젖힌다.',
        desc: '고등급 감염자들로만 구성된 국제 테러 조직, \'황금망각\'을 인류에게 주어진 축복으로 보며 백신을 없애고 전인류를 감염자로 만들고자 한다.'
    },
    {
        title: '마왕',
        quote: '세상이 미워, 어째서 나만 이런 꼴을 겪어야 하는 것이지?',
        desc: '1세대 백신과 2세대 백신 사이의 혼란기에 등장한 존재다. 현 호주 대륙을 실효 지배하고 있으며 모든 생물의 유전 정보를 다룰 수 있는 초상능력이 있는 것으로 추정되고 있다. 3세대 백신의 실마리.'
    },
    {
        title: '성인청',
        quote: '인류는 새로운 시작(탄생)과 스스로 끝낼 권리(사망)을 잃었다. 우리는 오직 이 가라앉는 배가 내일은 버텨 주기를 바랄 뿐이다.',
        desc: '대규모 \'황금망각\' 사태의 발발 이후 등장한 보건복지부 산하 기관이다.'
    }
]

let lastIndex, lastCaller;

function showFactionDesc(index, caller) {
    if (lastIndex === index) {
        hideFactionDesc();
        return;
    }
    lastIndex = index;
    if (lastCaller) lastCaller.classList.toggle('active', false);
    lastCaller = caller;
    lastCaller.classList.toggle('active', true);
    factionDescription.innerHTML = `
<p class="extendable__title">${factionDesc[index].title}</p>
<p class="extendable__quote">${factionDesc[index].quote}</p>
<p class="extendable__desc">${factionDesc[index].desc}</p>
    <button class="extendable__close" onclick="hideFactionDesc()"></button>
    `;
    factionDescription.scrollTop = 0;
}

function hideFactionDesc() {
    factionDescription.innerHTML = '';
    lastIndex = null;
    lastCaller.classList.toggle('active', false);
}