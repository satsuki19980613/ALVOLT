import { skinManager } from "../../../game-server/cloud-run-server/public/src/systems/SkinManager.js";
import { ObstacleSkins } from "../../../game-server/cloud-run-server/public/src/skins/ObstacleSkins.js";

// エディタの状態
const state = {
    className: "obs-hexagon-fortress-animated",
    width: 160,
    height: 160,
    // colliders に angle プロパティを追加
    colliders: [], // { type: 'rect', x, y, w, h, angle }
    selectedIndex: -1,
    scale: 2.0,
    isDragging: false,
    lastMouse: { x: 0, y: 0 }
};

const canvas = document.getElementById("editor-canvas");
const ctx = canvas.getContext("2d");
let skinCache = null;

// UI Elements (Rotationを追加)
const listEl = document.getElementById("collider-list");
const propPanel = document.getElementById("prop-panel");
const inpX = document.getElementById("prop-x");
const inpY = document.getElementById("prop-y");
const inpW = document.getElementById("prop-w");
const inpH = document.getElementById("prop-h");
const inpAngle = document.getElementById("prop-angle"); // ★追加

function init() {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    updateSkin();
    renderLoop();
    setupUI();
    setupCanvasEvents();
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

function updateSkin() {
    state.className = document.getElementById("inp-classname").value;
    state.width = parseFloat(document.getElementById("inp-width").value);
    state.height = parseFloat(document.getElementById("inp-height").value);

    // アニメーション対応スキンの場合は progress=0 で固定表示
    const drawFunc = ObstacleSkins[state.className];
    const func = typeof drawFunc === 'function' && drawFunc.length <= 1 
        ? drawFunc(0.0) 
        : (drawFunc || ObstacleSkins["default"]);

    skinCache = skinManager.getSkin(`editor_preview_${state.className}`, state.width, state.height, func);
}

function renderLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(state.scale, state.scale);

    // 1. スキン描画
    if (skinCache) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(skinCache, -state.width / 2, -state.height / 2);
        ctx.globalAlpha = 1.0;
    }

    // 2. 基準枠線
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-state.width / 2, -state.height / 2, state.width, state.height);
    
    // 3. 中心点
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();

    // 4. コライダー描画 (回転対応)
    state.colliders.forEach((c, i) => {
        const isSelected = i === state.selectedIndex;
        
        ctx.save();
        // ★ 矩形の中心へ移動してから回転
        ctx.translate(c.x, c.y);
        ctx.rotate((c.angle || 0) * Math.PI / 180);

        ctx.beginPath();
        // 原点中心で描画
        ctx.rect(-c.w/2, -c.h/2, c.w, c.h);

        ctx.fillStyle = isSelected ? "rgba(0, 255, 0, 0.3)" : "rgba(0, 255, 0, 0.1)";
        ctx.strokeStyle = isSelected ? "#0f0" : "rgba(0, 255, 0, 0.5)";
        ctx.lineWidth = isSelected ? 2 : 1;
        
        ctx.fill();
        ctx.stroke();

        // 向きがわかるように「上」方向へ線を描く
        if (isSelected) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -c.h/2);
            ctx.strokeStyle = "#fff";
            ctx.stroke();
        }

        ctx.restore();
    });

    ctx.restore();
    requestAnimationFrame(renderLoop);
}

function setupUI() {
    document.getElementById("btn-load-skin").onclick = updateSkin;

    document.getElementById("btn-add-rect").onclick = () => {
        // angle: 0 で初期化
        state.colliders.push({ type: "rect", x: 0, y: 0, w: 40, h: 40, angle: 0 });
        selectCollider(state.colliders.length - 1);
        updateList();
    };

    document.getElementById("btn-delete").onclick = () => {
        if (state.selectedIndex >= 0) {
            state.colliders.splice(state.selectedIndex, 1);
            state.selectedIndex = -1;
            updateList();
            propPanel.style.display = "none";
        }
    };

    document.getElementById("btn-export").onclick = () => {
        // ▼▼▼ 修正: 出力するJSONオブジェクトを拡張 ▼▼▼
        const exportData = {
            // idとnameは一旦 className と同じにしておきます（必要に応じて手動変更）
            id: state.className,
            name: state.className, 
            type: "obstacle_wall", // 固定値
            className: state.className,
            width: state.width,
            height: state.height,
            borderRadius: 0, // 必要であればデフォルト値
            colliders: state.colliders
        };

        const json = JSON.stringify(exportData, null, 2);
        // ▲▲▲

        document.getElementById("json-output").value = json;
        navigator.clipboard.writeText(json).then(() => alert("JSON Copied to Clipboard!"));
    };

    // プロパティ変更イベント (Angle追加)
    [inpX, inpY, inpW, inpH, inpAngle].forEach(el => {
        el.addEventListener("input", () => {
            const c = state.colliders[state.selectedIndex];
            if (!c) return;
            c.x = parseFloat(inpX.value) || 0;
            c.y = parseFloat(inpY.value) || 0;
            c.w = parseFloat(inpW.value) || 10;
            c.h = parseFloat(inpH.value) || 10;
            c.angle = parseFloat(inpAngle.value) || 0; // ★追加
            updateList();
        });
    });
}

function updateList() {
    listEl.innerHTML = "";
    state.colliders.forEach((c, i) => {
        const div = document.createElement("div");
        div.className = `collider-item ${i === state.selectedIndex ? 'selected' : ''}`;
        // 回転角度もリストに表示
        div.textContent = `[${i}] Rect (${Math.round(c.x)},${Math.round(c.y)}) ${c.angle||0}°`;
        div.onclick = () => selectCollider(i);
        listEl.appendChild(div);
    });
}

function selectCollider(index) {
    state.selectedIndex = index;
    updateList();
    
    const c = state.colliders[index];
    if (!c) {
        propPanel.style.display = "none";
        return;
    }

    propPanel.style.display = "block";
    inpX.value = c.x;
    inpY.value = c.y;
    inpW.value = c.w;
    inpH.value = c.h;
    inpAngle.value = c.angle || 0; // ★追加
}

// マウス操作 (回転対応版ヒットテスト)
function setupCanvasEvents() {
    canvas.addEventListener("mousedown", e => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left - canvas.width/2) / state.scale;
        const my = (e.clientY - rect.top - canvas.height/2) / state.scale;
        
        // 手前(配列の後ろ)からヒットテスト
        for (let i = state.colliders.length - 1; i >= 0; i--) {
            const c = state.colliders[i];
            
            // ★回転した矩形へのヒットテスト
            // マウス座標を、矩形のローカル座標系（回転なし）に変換して判定する
            const dx = mx - c.x;
            const dy = my - c.y;
            const rad = -(c.angle || 0) * Math.PI / 180; // 逆回転
            
            const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
            const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

            const halfW = c.w / 2;
            const halfH = c.h / 2;

            if (localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH) {
                selectCollider(i);
                state.isDragging = true;
                state.lastMouse = { x: mx, y: my };
                return;
            }
        }
        selectCollider(-1);
    });

    window.addEventListener("mousemove", e => {
        if (!state.isDragging || state.selectedIndex < 0) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left - canvas.width/2) / state.scale;
        const my = (e.clientY - rect.top - canvas.height/2) / state.scale;

        const c = state.colliders[state.selectedIndex];
        
        // 移動処理
        c.x += mx - state.lastMouse.x;
        c.y += my - state.lastMouse.y;
        
        c.x = Math.round(c.x * 10) / 10;
        c.y = Math.round(c.y * 10) / 10;

        inpX.value = c.x;
        inpY.value = c.y;
        
        state.lastMouse = { x: mx, y: my };
    });

    window.addEventListener("mouseup", () => {
        state.isDragging = false;
        updateList(); 
    });
}

init();