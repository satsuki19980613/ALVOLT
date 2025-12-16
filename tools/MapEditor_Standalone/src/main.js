import { EditorCore } from "./EditorCore.js";
import { skinManager } from "../../../game-server/cloud-run-server/public/src/systems/SkinManager.js";
import { ObstacleSkins } from "../../../game-server/cloud-run-server/public/src/skins/ObstacleSkins.js";
const engine = new EditorCore("editor-canvas", "dom-preview-layer");
const presetList = document.getElementById("preset-list");
const canvasWrapper = document.getElementById("canvas-wrapper");
const ASSET_BASE_URL = "https://alvolt-official.web.app";
const PRESETS_URL = "https://alvolt-official.web.app/data/presets.json";

async function initEditor() {
  try {
    // 末尾に ?t=現在時刻 をつけることで、ブラウザに「新しいファイルだ」と思わせてキャッシュを回避する
    const noCacheUrl = `${PRESETS_URL}?t=${Date.now()}`;
    const res = await fetch(noCacheUrl);
    if (!res.ok) throw new Error("プリセットの取得に失敗しました");

    const presets = await res.json();
    console.log("プリセット読み込み完了:", presets);

    generatePresetButtons(presets);

    setupDropZone();
  } catch (err) {
    console.error("初期化エラー:", err);
    presetList.innerHTML = `<p style="color:red; font-size:12px;">通信エラー<br>${err.message}</p>`;
  }
}

function generatePresetButtons(presets) {
  presetList.innerHTML = "";

  presets.forEach((preset) => {
    const btn = document.createElement("div");
    btn.className = "preset-item";
    btn.draggable = true;

    const previewContainer = document.createElement("div");
    previewContainer.className = "preview-box";
    previewContainer.style.width = "40px";
    previewContainer.style.height = "40px";

    let rawFunc = ObstacleSkins[preset.className];
    let skinFunc;

    if (rawFunc) {
        if (typeof rawFunc === 'function' && rawFunc.length === 1) {
            skinFunc = rawFunc(0.0);
        } else {
            skinFunc = rawFunc;
        }
    } else {
        console.warn(`Skin not found for class: ${preset.className}. Using default.`);
        skinFunc = (ctx, w, h) => {
            ctx.fillStyle = "#444"; 
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = "#888";
            ctx.strokeRect(0, 0, w, h);
            ctx.fillStyle = "white";
            ctx.font = "10px Arial";
            ctx.fillText("NoSkin", 2, 10);
        };
    }

    const skinCanvas = skinManager.getSkin(
      `preview_${preset.id}`,
      40,
      40,
      skinFunc
    );

    previewContainer.appendChild(skinCanvas);

    btn.appendChild(previewContainer);

    const label = document.createElement("span");
    label.textContent = preset.name;
    btn.appendChild(label);

    btn.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("application/json", JSON.stringify(preset));
      e.dataTransfer.effectAllowed = "copy";
    });

    presetList.appendChild(btn);
  });
}

function setupDropZone() {
  canvasWrapper.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });

  canvasWrapper.addEventListener("drop", (e) => {
    e.preventDefault();
    const jsonData = e.dataTransfer.getData("application/json");
    if (!jsonData) return;

    try {
      const preset = JSON.parse(jsonData);
      const rect = engine.canvas.getBoundingClientRect();
      const worldPos = engine.screenToWorld(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
      engine.addObjectFromPreset(
        preset,
        worldPos.x - preset.width / 2,
        worldPos.y - preset.height / 2
      );
    } catch (err) {
      console.error("Drop Error:", err);
    }
  });
}

const canvas = engine.canvas;

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (e.button === 1 || e.ctrlKey) {
    engine.input.isPanning = true;
    engine.input.startX = e.clientX;
    engine.input.startY = e.clientY;
    return;
  }

  if (e.button === 0) {
    const handle = engine.hitTestHandle(mx, my, engine.selectedObj);
    if (handle) {
      engine.input.isDragging = true;
      engine.input.dragMode = `resize-${handle}`;
      engine.input.startX = engine.screenToWorld(mx, my).x;
      engine.input.startY = engine.screenToWorld(mx, my).y;
      engine.input.initialObjState = { ...engine.selectedObj };
      return;
    }

    const hitObj = engine.hitTestObject(mx, my);
    if (hitObj) {
      engine.selectObject(hitObj);
      engine.input.isDragging = true;
      engine.input.dragMode = "move";
      engine.input.startX = engine.screenToWorld(mx, my).x;
      engine.input.startY = engine.screenToWorld(mx, my).y;
      engine.input.initialObjState = { ...hitObj };
    } else {
      engine.selectObject(null);
    }
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (engine.input.isPanning) {
    const dx = (e.clientX - engine.input.startX) / engine.camera.zoom;
    const dy = (e.clientY - engine.input.startY) / engine.camera.zoom;
    engine.camera.x -= dx;
    engine.camera.y -= dy;
    engine.input.startX = e.clientX;
    engine.input.startY = e.clientY;
    return;
  }

  if (engine.input.isDragging && engine.selectedObj) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const currentWorldPos = engine.screenToWorld(mx, my);

    const dx = currentWorldPos.x - engine.input.startX;
    const dy = currentWorldPos.y - engine.input.startY;

    const obj = engine.selectedObj;
    const init = engine.input.initialObjState;
    const snap = (v) => Math.round(v / 10) * 10;

    if (engine.input.dragMode === "move") {
      obj.x = snap(init.x + dx);
      obj.y = snap(init.y + dy);
    } else if (engine.input.dragMode.startsWith("resize")) {
      const mode = engine.input.dragMode.split("-")[1];
      if (mode === "se") {
        obj.w = Math.max(20, snap(init.w + dx));
        obj.h = Math.max(20, snap(init.h + dy));
      } else if (mode === "sw") {
        const newW = Math.max(20, snap(init.w - dx));
        obj.x = init.x + (init.w - newW);
        obj.w = newW;
        obj.h = Math.max(20, snap(init.h + dy));
      } else if (mode === "ne") {
        obj.w = Math.max(20, snap(init.w + dx));
        const newH = Math.max(20, snap(init.h - dy));
        obj.y = init.y + (init.h - newH);
        obj.h = newH;
      } else if (mode === "nw") {
        const newW = Math.max(20, snap(init.w - dx));
        const newH = Math.max(20, snap(init.h - dy));
        obj.x = init.x + (init.w - newW);
        obj.y = init.y + (init.h - newH);
        obj.w = newW;
        obj.h = newH;
      }
    }
    updateUI();
  }

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const hoverHandle = engine.hitTestHandle(mx, my, engine.selectedObj);
  if (hoverHandle) {
    canvas.style.cursor = "pointer";
  } else if (engine.hitTestObject(mx, my)) {
    canvas.style.cursor = "move";
  } else {
    canvas.style.cursor = "default";
  }
});

canvas.addEventListener("mouseup", () => {
  engine.input.isDragging = false;
  engine.input.isPanning = false;
  engine.input.dragMode = null;
});

canvas.addEventListener(
  "wheel",
  (e) => {
    const zoomSpeed = 0.001;
    engine.camera.zoom = Math.max(
      0.1,
      Math.min(5.0, engine.camera.zoom - e.deltaY * zoomSpeed)
    );
  },
  { passive: false }
);

const ui = {
  panel: document.getElementById("property-panel"),
  valType: document.getElementById("val-type"),
  inpX: document.getElementById("prop-x"),
  inpY: document.getElementById("prop-y"),
  inpW: document.getElementById("prop-w"),
  inpH: document.getElementById("prop-h"),
  inpRot: document.getElementById("prop-rotation"),
  btnDel: document.getElementById("btn-delete"),
  inputs: [],
};
ui.inputs = [ui.inpX, ui.inpY, ui.inpW, ui.inpH, ui.inpRot, ui.btnDel];

toggleInputs(false);

window.addEventListener("selectionChanged", (e) => {
  const obj = e.detail;
  if (obj) {
    toggleInputs(true);
    updateUI();
  } else {
    toggleInputs(false);
    clearUI();
  }
});

function toggleInputs(enable) {
  ui.inputs.forEach((el) => {
    if (el) {
      el.disabled = !enable;
      el.style.opacity = enable ? "1" : "0.5";
    }
  });
}

function clearUI() {
  if (ui.valType) ui.valType.textContent = "-";
  if (ui.inpX) ui.inpX.value = "";
  if (ui.inpY) ui.inpY.value = "";
  if (ui.inpW) ui.inpW.value = "";
  if (ui.inpH) ui.inpH.value = "";
  if (ui.inpRot) ui.inpRot.value = "";
}

function updateUI() {
  const obj = engine.selectedObj;
  if (!obj) return;
  if (ui.valType) ui.valType.textContent = obj.styleType;
  if (ui.inpX) ui.inpX.value = obj.x;
  if (ui.inpY) ui.inpY.value = obj.y;
  if (ui.inpW) ui.inpW.value = obj.w;
  if (ui.inpH) ui.inpH.value = obj.h;
  if (ui.inpRot) ui.inpRot.value = obj.rotation;
}

["x", "y", "w", "h", "rotation"].forEach((key) => {
  const el = document.getElementById(`prop-${key}`);
  if (el) {
    el.addEventListener("input", (e) => {
      if (engine.selectedObj) {
        engine.selectedObj[key] = parseFloat(e.target.value);
      }
    });
  }
});

if (ui.btnDel)
  ui.btnDel.addEventListener("click", () => engine.deleteSelected());

document.getElementById("btn-export").addEventListener("click", () => {
  
  // ★ EditorCore側で計算済みのデータ（拡大縮小されたコライダーを含む）を取得
  const calculatedObstacles = engine.getExportData(); 

  const exportData = {
    worldSize: { width: engine.WORLD_SIZE, height: engine.WORLD_SIZE },
    obstacles: calculatedObstacles, // ★ ここに代入
    playerSpawns: [{ x: 500, y: 500 }],
    enemySpawns: [{ x: 1500, y: 1500 }],
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "map_default.json";
  a.click();
});
// MapEditor_Standalone/src/main.js の該当箇所をイメージ

document.getElementById("btn-export").onclick = () => {
    // 新しい getExportData() を呼び出す
    const data = editor.getExportData();
    
    // JSON文字列に変換
    const json = JSON.stringify(data, null, 2);
    
    // クリップボードにコピー
    navigator.clipboard.writeText(json).then(() => {
        alert("パレット形式のJSONをクリップボードにコピーしました！");
    }).catch(err => {
        console.error("コピーに失敗しました:", err);
        // コピー失敗時はコンソールに出す
        console.log(json);
        alert("コピーに失敗しました。コンソールを確認してください。");
    });
};
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.key === "Delete" || e.key === "Backspace") {
    engine.deleteSelected();
  }
});

initEditor();
