'use strict';
const SkillState = {
    EMPTY: 'empty',
    CHARGING: 'charging',
    SET: 'set'
}
class ShootingGame {
    rootPath;
    worker;
    offscreen;
    container;
    remain_cost = 0;
    max_cost = 10;
    offset_cost = 0.025;
    timer = null;
    skill = [

    ]
    last_used = {

    };
    constructor(container, rootPath = '/game/shooting') {
        this.container = container;
        this.rootPath = rootPath;

        this.costGauge__bar = document.querySelector('.gameMenu_costGauge__bar');
        this.costGauge__count = document.querySelector('.gameMenu_costGauge__count');
        this.score_board = document.querySelector('.topMenu__score');

        document.querySelectorAll('.gameMenu__skillSet__skill').forEach((skill, index) => this.skill[index] = {
            container: skill,
            state: SkillState.EMPTY
        })

        let canvas = document.createElement('canvas');
        canvas.setAttribute('height', 600);
        canvas.setAttribute('width', 400);

        this.container.appendChild(canvas);

        this.offscreen = canvas.transferControlToOffscreen();

        this.worker = new Worker(`${this.rootPath}/worker.js?${Math.random()}`);

        this.worker.onmessage = this.onmessage;

        document.addEventListener('keydown', this.onKeyEvent('keydown'), false);
        document.addEventListener('keyup', this.onKeyEvent('keyup'), false);
    }

    onmessage = event => {
        switch (event.data.type) {
            case 'ready':
                this.worker.postMessage({ type: 'init', canvas: this.offscreen, rootPath: this.rootPath }, [this.offscreen]);
                break;
            case 'start':
                this.timer = setInterval(() => this.increaseCost(), 25);
                break;
            case 'pause':
                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
                break;
            case 'score':
                this.score_board.innerHTML = event.data.score;
                break;
            case 'skill_set':
                this.setSkill(event.data.info);
                break;
            case 'message':
                let message_container = document.createElement('div');
                message_container.classList.add(`gameContainer__message_${event.data.position}`);
                message_container.innerHTML = event.data.html;
                this.container.appendChild(message_container);
                setTimeout(() => {
                    message_container.remove();
                }, event.data.time);
                break;
            default:
                console.log(event.data);
                break;
        }
    }

    onKeyEvent = eventName => event => {
        switch (event.key) {
            case "Down": // IE/Edge에서 사용되는 값
            case "ArrowDown":
                // "아래 화살표" 키가 눌렸을 때의 동작입니다.
                this.worker.postMessage({ type: 'keyDirect', eventName: eventName, key: 'down' });
                break;
            case "Up": // IE/Edge에서 사용되는 값
            case "ArrowUp":
                // "위 화살표" 키가 눌렸을 때의 동작입니다.
                this.worker.postMessage({ type: 'keyDirect', eventName: eventName, key: 'up' });
                break;
            case "Left": // IE/Edge에서 사용되는 값
            case "ArrowLeft":
                // "왼쪽 화살표" 키가 눌렸을 때의 동작입니다.
                this.worker.postMessage({ type: 'keyDirect', eventName: eventName, key: 'left' });
                break;
            case "Right": // IE/Edge에서 사용되는 값
            case "ArrowRight":
                // "오른쪽 화살표" 키가 눌렸을 때의 동작입니다.
                this.worker.postMessage({ type: 'keyDirect', eventName: eventName, key: 'right' });
                break;
            case "Enter":
                this.worker.postMessage({ type: 'keyInput', eventName: eventName, key: 'enter' });
                // "enter" 또는 "return" 키가 눌렸을 때의 동작입니다.
                break;
            case "w":
            case "W":
                this.worker.postMessage({ type: 'keyInput', eventName: eventName, key: 'w' });
                break;
            case "1":
            case "2":
            case "3":
                if(eventName == 'keyup') return;
                let skill = this.skill[event.key - 1];
                if (skill.state == SkillState.SET) {
                    this.skill[event.key - 1].state = SkillState.EMPTY;
                    this.remain_cost -= skill.cost | 0;
                    skill.container.setAttribute('state', SkillState.EMPTY);
                    this.worker.postMessage({ type: 'keyInput', eventName: eventName, key: event.key, skillName: skill.name });
                }
                break;
            case "Esc": // IE/Edge에서 사용되는 값
            case "Escape":
                // "esc" 키가 눌렸을 때의 동작입니다.
                break;
            default:
                return; // 키 이벤트를 처리하지 않는다면 종료합니다.
        }
    }

    increaseCost = () => {
        if (this.remain_cost >= this.max_cost) return;
        this.remain_cost += this.offset_cost;
        this.costGauge__bar.style.setProperty('--progress', this.remain_cost / this.max_cost);
        this.costGauge__count.innerHTML = Math.floor(this.remain_cost);
        this.skill.forEach(this.isUseableSkill);
    }

    setSkill = (skill) => {
        for(let index in this.skill){
            if(this.skill[index].state == SkillState.EMPTY){
                this.skill[index] = {...this.skill[index],...(skill || {})};
                this.skill[index].state = SkillState.CHARGING;
                this.skill[index].container.setAttribute('state', SkillState.CHARGING);
                this.skill[index].container.setAttribute('cost', this.skill[index].cost);
                this.skill[index].container.style.setProperty('background-image', `url("${skill.image_url}")`);
                break;
            }
        }
    }

    isUseableSkill = (skill, index) => {
        if([SkillState.CHARGING, SkillState.SET].indexOf(skill.state) < 0) return;
        if(skill.cost > this.remain_cost){
            this.skill[index].state = SkillState.CHARGING;
            skill.container.style.setProperty('--progress', `${Math.min(Math.floor(this.remain_cost / skill.cost * 100),100)}%`);
        }else{
            this.skill[index].state = SkillState.SET;
            skill.container.style.removeProperty('--progress');

        }
        skill.container.setAttribute('state', this.skill[index].state);
    }

    break = () => {
        if (typeof worker == 'object') {
            this.worker.terminate();
            this.worker = null;
            document.removeEventListener('keydown', this.onKeyEvent('keydown'), false);
            document.removeEventListener('keyup', this.onKeyEvent('keyup'), false);
        }
        for (child of this.container.children) child.remove();
    }
}