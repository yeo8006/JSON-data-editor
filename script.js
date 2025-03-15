/************************************
 * 초기 로드: 최상위 루트 에디터 생성 및 이벤트 등록
 ************************************/
window.addEventListener('DOMContentLoaded', () => {
  const rootEditor = document.getElementById('rootEditor');

  // 최상위는 객체 에디터
  const objectEditor = createObjectEditor();
  rootEditor.appendChild(objectEditor);

  document.getElementById('uploadInput').addEventListener('change', handleFileUpload);

  document.getElementById('downloadBtn').addEventListener('click', downloadJSON);
 
  const inspectModal = document.getElementById('inspectModal');
  document.getElementById('closeInspectBtn').addEventListener('click', () => {
    inspectModal.classList.add("hidden");
  });

  window.addEventListener('click', (event) => {
    if (event.target === inspectModal) {
      inspectModal.classList.add('hidden');
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      inspectModal.classList.add("hidden");
    }
  });

  function permitTabKeyToText(event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const inputElement = event.target;
      const start = inputElement.selectionStart;
      const end = inputElement.selectionEnd;
      const text = inputElement.value;
      
      inputElement.value = text.substring(0, start) + '\t' + text.substring(end);
      inputElement.selectionStart = inputElement.selectionEnd = start + 1;
    }
  }
  document.getElementById('jsonContent').addEventListener('keydown', permitTabKeyToText);

  document.getElementById('jsonPathCopybtn').addEventListener('click', () =>{
    const jsonPath = document.getElementById('jsonPath');
    navigator.clipboard.writeText(jsonPath.textContent).then(() => {
      showMessage(jsonPath, "클립보드 저장");
    }).catch(err => {
        console.error("클립보드 복사 실패:", err);
    });
  });
  document.getElementById('jsonContentCopybtn').addEventListener('click', () =>{
    const jsonContent = document.getElementById('jsonContent');
    navigator.clipboard.writeText(jsonContent.textContent).then(() => {
      showMessage(jsonContent, "클립보드 저장");
    }).catch(err => {
        console.error("클립보드 복사 실패:", err);
    });
  });
});

/* --------------------------------------------------
   1) 에디터 생성 및 항목 추가
   -------------------------------------------------- */

const EXPAND_SVG_STR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" style="fill: rgba(255, 255, 255, 1);transform: ;msFilter:;"><path d="M16.293 9.293 12 13.586 7.707 9.293l-1.414 1.414L12 16.414l5.707-5.707z"></path></svg>`;
const COLLAPSE_SVG_STR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" style="fill: rgba(255, 255, 255, 1);transform: ;msFilter:;"><path d="M10.707 17.707 16.414 12l-5.707-5.707-1.414 1.414L13.586 12l-4.293 4.293z"></path></svg>`;

/**
 * 새로운 Object 편집기 반환
 * @returns {HTMLElement}
 */
function createObjectEditor() {
  const editor = document.createElement('div');
  editor.className = 'object-editor';

  const editorButtons = document.createElement('div');
  editorButtons.className = 'editor-buttons';

  const addButton = document.createElement('button');
  addButton.className = 'add-button';
  addButton.textContent = '+';

  const inspectButton = document.createElement('button');
  inspectButton.className = 'inspect-button';
  inspectButton.textContent = '🔍';

  const expandButton = document.createElement('button');
  expandButton.className = 'expand-button';
  expandButton.title = '펼치기';
  expandButton.innerHTML = EXPAND_SVG_STR;
  expandButton.classList.add('hidden');

  const collapseButton = document.createElement('button');
  collapseButton.className = 'collapse-button';
  collapseButton.title = '접기';
  collapseButton.innerHTML = COLLAPSE_SVG_STR;
  collapseButton.classList.add('hidden');

  editorButtons.appendChild(addButton);
  editorButtons.appendChild(inspectButton);
  editorButtons.appendChild(expandButton);
  editorButtons.appendChild(collapseButton);

  addButton.addEventListener('click', () => {
    const children = Array.from(editor.children).slice(1); // .slice(1): 버튼 제외
    children.forEach(child => {
      child.classList.remove('hidden');
    });
    expandButton.classList.add('hidden');
    collapseButton.classList.remove('hidden');
    addProperty(editor);
  });

  inspectButton.addEventListener('click', () => {
    inspectObject(editor);
  });

  expandButton.addEventListener('click', () => {
    const children = Array.from(editor.children).slice(1); // .slice(1): 버튼 제외
    children.forEach(child => {
      child.classList.remove('hidden');
    });
    expandButton.classList.add('hidden');
    collapseButton.classList.remove('hidden');
  });

  collapseButton.addEventListener('click', () => {
    const children = Array.from(editor.children).slice(1); // .slice(1): 버튼 제외
    children.forEach(child => {
      child.classList.add('hidden');
    });
    expandButton.classList.remove('hidden');
    collapseButton.classList.add('hidden');
  });
  
  editor.appendChild(editorButtons);
  // editor.appendChild(addButton);
  // editor.appendChild(inspectButton);
  // editor.appendChild(expandButton);

  return editor;
}

/**
 * objectEditor 내부에 새 속성(key, type, property)을 추가
 * – 기본적으로 새 속성의 타입은 "object"로 설정하고 sub editor가 즉시 생성
 * - JSON 기본 타입 'object', 'array', 'number', 'string', 'boolean', 'null' 지원
 * @param {HTMLElement} objectEditor 
 */
function addProperty(objectEditor) {
  const propertyContainer = document.createElement('div');
  propertyContainer.className = 'property-container';

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-button';
  removeButton.textContent = 'x';
  removeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    propertyContainer.remove();
    const children = Array.from(objectEditor.children).slice(1); // .slice(1): 버튼 제외
    if (children.length == 0) {
      const expandButton = objectEditor.querySelector('.expand-button');
      const collapseButton = objectEditor.querySelector('.collapse-button');
      expandButton.classList.add('hidden');
      collapseButton.classList.add('hidden');
    }
  });

  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.className = 'key-input';
  keyInput.placeholder = 'Property Name';

  const typeSelect = document.createElement('select');
  typeSelect.className = 'type-select';
  const types = ['object', 'array', 'number', 'string', 'boolean', 'null'];
  types.forEach(t => {
    const option = document.createElement('option');
    option.value = t;
    option.textContent = t;
    typeSelect.appendChild(option);
  });
  typeSelect.value = 'object'; // 기본값을 'object'로 설정

  const propertyMain = document.createElement('div');
  propertyMain.className = 'property-main';
  propertyMain.appendChild(removeButton);
  propertyMain.appendChild(keyInput);
  propertyMain.appendChild(typeSelect);

  const propertySub = document.createElement('div');
  propertySub.className = 'property-sub';

  propertyContainer.appendChild(propertyMain);
  propertyContainer.appendChild(propertySub);
  
  typeSelect.addEventListener('change', () => updateSubEditor(propertyContainer, propertySub, typeSelect.value));
  updateSubEditor(propertyContainer, propertySub, typeSelect.value);

  objectEditor.appendChild(propertyContainer);
}

/**
 * 새로운 Array 편집기를 반환
 * @returns {HTMLElement}
 */
function createArrayEditor() {
  const editor = document.createElement('div');
  editor.className = 'array-editor';

  const editorButtons = document.createElement('div');
  editorButtons.className = 'editor-buttons';

  const addButton = document.createElement('button');
  addButton.className = 'add-button';
  addButton.textContent = '+';

  const expandButton = document.createElement('button');
  expandButton.className = 'expand-button';
  expandButton.title = '펼치기';
  expandButton.innerHTML = EXPAND_SVG_STR;
  expandButton.classList.add('hidden');

  const collapseButton = document.createElement('button');
  collapseButton.className = 'collapse-button';
  collapseButton.title = '접기';
  collapseButton.innerHTML = COLLAPSE_SVG_STR;
  collapseButton.classList.add('hidden');

  editorButtons.appendChild(addButton);
  editorButtons.appendChild(expandButton);
  editorButtons.appendChild(collapseButton);

  addButton.addEventListener('click', () => {
    const children = Array.from(editor.children).slice(1); // .slice(1): 버튼 제외
    children.forEach(child => {
      child.classList.remove('hidden');
    });
    expandButton.classList.add('hidden');
    collapseButton.classList.remove('hidden');
    addItem(editor);
  });

  expandButton.addEventListener('click', () => {
    const children = Array.from(editor.children).slice(1); // .slice(1): 버튼 제외
    children.forEach(child => {
      child.classList.remove('hidden');
    });
    expandButton.classList.add('hidden');
    collapseButton.classList.remove('hidden');
  });

  collapseButton.addEventListener('click', () => {
    const children = Array.from(editor.children).slice(1); // .slice(1): 버튼 제외
    children.forEach(child => {
      child.classList.add('hidden');
    });
    expandButton.classList.remove('hidden');
    collapseButton.classList.add('hidden');
  });
  
  editor.appendChild(editorButtons);
  // editor.appendChild(addButton);
  // editor.appendChild(expandButton);

  return editor;
}

/**
 * arrayEditor 내부에 새 항목(type, value)을 추가
 * – 기본적으로 새 속성의 타입은 "string"으로 설정
 * - JSON 기본 타입 'object', 'array', 'number', 'string', 'boolean', 'null' 지원
 * @param {HTMLElement} arrayEditor 
 */
function addItem(arrayEditor) {
  const itemContainer = document.createElement('div');
  itemContainer.className = 'item-container';

  // 삭제 버튼
  const removeButton = document.createElement('button');
  removeButton.className = 'remove-button';
  removeButton.textContent = 'x';
  removeButton.addEventListener('click', () => {
    itemContainer.remove();
    const children = Array.from(arrayEditor.children).slice(1); // .slice(1): 버튼 제외
    if (children.length == 0) {
      const expandButton = arrayEditor.querySelector('.expand-button');
      const collapseButton = arrayEditor.querySelector('.collapse-button');
      expandButton.classList.add('hidden');
      collapseButton.classList.add('hidden');
    }
  });

  const typeSelect = document.createElement('select');
  typeSelect.className = 'type-select';
  const types = ['object', 'array', 'number', 'string', 'boolean', 'null'];
  types.forEach(t => {
    const option = document.createElement('option');
    option.value = t;
    option.textContent = t;
    typeSelect.appendChild(option);
  });
  typeSelect.value = 'string'; // 기본값을 'string'으로 설정

  const itemMain = document.createElement('div');
  itemMain.className = 'item-main';
  itemMain.appendChild(removeButton);
  itemMain.appendChild(typeSelect);

  const itemSub = document.createElement('div');
  itemSub.className = 'item-sub';

  itemContainer.appendChild(itemMain);
  itemContainer.appendChild(itemSub);

  typeSelect.addEventListener('change', () => updateSubEditor(itemContainer, itemSub, typeSelect.value));
  updateSubEditor(itemContainer, itemSub, typeSelect.value);

  arrayEditor.append(itemContainer);
}

/**
 * 새로운 Number 편집기를 반환한다.
 * @returns {HTMLElement}
 */
function createNumberEditor() {
  const editor = document.createElement('div');
  editor.className = 'number-editor';

  const numberInput = document.createElement('input');
  numberInput.type = 'number';
  numberInput.className = 'number-input';

  editor.appendChild(numberInput);

  return editor;
}

/**
 * 새로운 String 편집기를 반환한다.
 * @returns {HTMLElement}
 */
function createStringEditor() {
  const editor = document.createElement('div');
  editor.className = 'string-editor';

  const stringInput = document.createElement('input');
  stringInput.type = 'text';
  stringInput.className = 'string-input';

  editor.appendChild(stringInput);

  return editor;
}

/**
 * 새로운 Boolean 편집기를 반환한다.
 * @returns {HTMLElement}
 */
function createBooleanEditor() {
  const editor = document.createElement('div');
  editor.className = 'boolean-editor';

  const trueButton = document.createElement('input');
  trueButton.type = 'button';
  trueButton.className = 'true-input';
  trueButton.value = 'True';
  trueButton.title = '더블클릭으로 변경';

  const falseButton = document.createElement('input');
  falseButton.type = 'button';
  falseButton.className = 'false-input';
  falseButton.value = 'False';
  falseButton.title = '더블클릭으로 변경';
  falseButton.classList.add('hidden');

  trueButton.addEventListener('dblclick', () => {
    trueButton.classList.add('hidden');
    falseButton.classList.remove('hidden');
  });

  falseButton.addEventListener('dblclick', () => {
    trueButton.classList.remove('hidden');
    falseButton.classList.add('hidden');
  });

  editor.appendChild(trueButton);
  editor.appendChild(falseButton);

  return editor;
}

function updateSubEditor(container, subContainer, selectedType) {
  container.classList.remove('has-many');
  subContainer.innerHTML = '';

  let subEditor;
  if (selectedType === 'object') {
    subEditor = createObjectEditor();
    container.classList.add('has-many');
  } else if (selectedType === 'array') {
    subEditor = createArrayEditor();
    container.classList.add('has-many');
  } else if (selectedType === 'number') {
    subEditor = createNumberEditor();
  } else if (selectedType === 'string') {
    subEditor = createStringEditor();
  } else if (selectedType === 'boolean') {
    subEditor = createBooleanEditor();
  } else if (selectedType === 'null') {
    // 공백 처리
  } else {
    // 지원하지 않는 타입
  }

  if (subEditor) {
    subContainer.appendChild(subEditor);
  }
}

/************************************
 * 2) 에디터 → JSON Schema 객체 변환 (다운로드/미리보기)
 ************************************/

/**
 * 다운로드 버튼 클릭 시: 에디터 → JSON Schema 객체 → 파일 다운로드
 */
function downloadJSON() {
  const rootEditor = document.getElementById('rootEditor');
  const objectEditor = rootEditor.querySelector('.object-editor');
  const jsonStr = editorToJsonString(objectEditor);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 편집기 DOM을 순회하여 JSON 데이터를 반환한다.
 * @params {HTMLElement} editor
 * @returns {String}
 */
function editorToJsonString(editor) {
  const data = collectObjectData(editor);
  return JSON.stringify(data, null, 2);
}

/**
 * 객체 편집기 DOM을 순회하여 Object 데이터로 변환
 * @param {HTMLElement} editor - .object-editor 요소
 * @returns {Object}
 */
function collectObjectData(editor) {
  const data = {};

  const containers = editor.querySelectorAll(':scope > .property-container');
  containers.forEach(container => {
    const keyInput = container.querySelector('.key-input');
    const key = keyInput.value.trim();
    if (!key) return;

    const typeSelect = container.querySelector('.type-select');
    const selectedType = typeSelect.value;

    const subContainer = container.querySelector('.property-sub');
    
    data[key] = collectSubData(subContainer, selectedType);
  });

  return data;
}

/**
 * 배열 편집기 DOM을 순회하여 Array 데이터로 변환
 * @param {HTMLElement} editor - .array-editor 요소
 * @returns {Array}
 */
function collectArrayData(editor) {
  const data = [];

  const containers = editor.querySelectorAll(':scope > .item-container');
  containers.forEach(container => {
    const typeSelect = container.querySelector('.type-select');
    const selectedType = typeSelect.value;
  
    const subContainer = container.querySelector('.item-sub');
  
    data.push(collectSubData(subContainer, selectedType));
  });

  return data;
}

/**
 * 하위 편집기 데이터를 스키마 데이터로 변환
 * @param {HTMLElement} container 
 * @param {String} type
 * @returns {any}
 */
function collectSubData(container, type) {
  let data;
  
  if (type === 'object') {
    const editor = container.querySelector('.object-editor');
    const propertyContainer = editor.querySelector('.property-container');
    data = propertyContainer ? collectObjectData(editor) : {};
  }
  else if (type === 'array') {
    const editor = container.querySelector('.array-editor');
    data = collectArrayData(editor);
  }
  else if (type === 'number') {
    const editor = container.querySelector('.number-editor');
    const numberInput = editor.querySelector('.number-input');
    data = numberInput.valueAsNumber;
  }
  else if (type === 'string') {
    const editor = container.querySelector('.string-editor');
    const stringInput = editor.querySelector('.string-input');
    data = stringInput.value;
  }
  else if (type === 'boolean') {
    const editor = container.querySelector('.boolean-editor');
    const trueInput = editor.querySelector('.true-input:not(.hidden)');
    data = trueInput ? true : false;
  }
  else if (type === 'null') {
    data = null;
  }
  else {
    // 지원하지 않는 타입
  }

  return data;
}

/************************************
 * 3) JSON 업로드 → 에디터에 로드
 ************************************/

/**
 * 파일 업로드 이벤트 핸들러
 */
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const rootEditor = document.getElementById('rootEditor');
    loadJsonStringToEditor(e.target.result, rootEditor);
  };
  reader.readAsText(file);
}

/**
 * JSON 문자열을 에디터에 로드
 * @param {String} jsonStr
 * @param {HTMLElement} container
 */
function loadJsonStringToEditor(jsonStr, container) {
  try {
    const jsonData = JSON.parse(jsonStr);
    loadJsonToEditor(jsonData, container);
  } catch (err) {
    alert('유효한 JSON 파일이 아닙니다.');
    console.log(err);
    throw new Error(err);
  }
}

/**
 * JSON 데이터를 에디터에 로드
 * @param {Object} data - JSON Schema 객체 (type: "object", properties: { ... })
 * @param {HTMLElement} container - 편집기를 하위 태그로 가지는 HTML 요소
 */
function loadJsonToEditor(data, container) {
  // 새 루트 object-editor 생성
  const objectEditor = createObjectEditor();
  buildEditorFromObject(data, objectEditor);

  container.innerHTML = ''; // 기존 에디터 초기화
  container.appendChild(objectEditor);
}

/**
 * JSON 데이터를 기반으로 에디터 UI를 재귀적으로 생성
 * @param {Object} data  
 * @param {HTMLElement} editor  
 */
function buildEditorFromObject(data, editor) {
  const addButton = editor.querySelector('.add-button');

  Object.keys(data).forEach(key => {
    const value = data[key];
    
    addButton.click();
    const container = editor.lastElementChild;

    const keyInput = container.querySelector('.key-input');
    keyInput.value = key;

    const type = getTypeOfJsonValue(value)

    const typeSelect = container.querySelector('.type-select');
    typeSelect.value = type;
    typeSelect.dispatchEvent(new Event('change', {}));

    const subContainer = container.querySelector('.property-sub');

    if (type === 'object') {
      const subEditor = subContainer.querySelector('.object-editor');
      buildEditorFromObject(value, subEditor);
    } 
    else if (type === 'array') {
      const subEditor = subContainer.querySelector('.array-editor');
      buildEditorFromArray(value, subEditor);
    }
    else if (type === 'number') {
      const subEditor = subContainer.querySelector('.number-editor');
      const numberInput = subEditor.querySelector('.number-input');
      numberInput.value = value;
    }
    else if (type === 'string') {
      const subEditor = subContainer.querySelector('.string-editor');
      const stringInput = subEditor.querySelector('.string-input');
      stringInput.value = value;
    }
    else if (type === 'boolean') {
      const subEditor = subContainer.querySelector('.boolean-editor');
      const trueInput = subEditor.querySelector('.true-input');
      const falseInput = subEditor.querySelector('.false-input');
      if (value) {
        trueInput.classList.remove('hidden');
        falseInput.classList.add('hidden');
      } else {
        trueInput.classList.add('hidden');
        falseInput.classList.remove('hidden');
      }
    }
    else if (type === 'null') {
      // 공백 처리
    }
    else {
      throw new Error("유효하지 않은 타입");
    }
  });
}

/**
 * JSON Schema의 properties 객체를 기반으로 에디터 UI를 재귀적으로 생성한다.
 * @param {Array} data 
 * @param {HTMLElement} editor
 */
function buildEditorFromArray(data, editor) {
  const addButton = editor.querySelector('.add-button');
  data.forEach(item => {
    addButton.click();
    const container = editor.lastElementChild;

    const type = getTypeOfJsonValue(item);
    const typeSelect = container.querySelector('.type-select');
    typeSelect.value = type;
    typeSelect.dispatchEvent(new Event('change', {}));

    if (type === 'object') {
      const subEditor = container.querySelector('.object-editor');
      buildEditorFromObject(item, subEditor);
    } else if (type === 'array') {
      const subEditor = container.querySelector('.array-editor');
      buildEditorFromArray(item, subEditor);
    } else if (type === 'number') {
      const subEditor = container.querySelector('.number-editor');
      const numberInput = subEditor.querySelector('.number-input');
      numberInput.value = item;
    } else if (type === 'string') {
      const subEditor = container.querySelector('.string-editor');
      const stringInput = subEditor.querySelector('.string-input');
      stringInput.value = item;
    } else if (type === 'boolean') {
      const subEditor = container.querySelector('.boolean-editor');
      const trueInput = subEditor.querySelector('.true-input');
      const falseInput = subEditor.querySelector('.false-input');
      if (item) {
        trueInput.classList.remove('hidden');
        falseInput.classList.add('hidden');
      } else {
        trueInput.classList.add('hidden');
        falseInput.classList.remove('hidden');
      }
    } else if (type === 'null') {
      // 공백 처리
    } else {
      // 지원하지 않는 타입
    }
  });
}

/**
 * JSON value의 타입을 반환
 * @param {any} value 
 * @returns {String} type
 */
function getTypeOfJsonValue(value) {
  let type;
  if (typeof value === 'string') {
    type = 'string';
  } else if (typeof value === 'number') {
    type = 'number';
  } else if (typeof value === 'boolean') {
    type = 'boolean';
  } else if (value === null) {
    type = 'null';
  } else if (Array.isArray(value)) {
    type = 'array';
  } else if (typeof value === 'object') {
    type = 'object';
  } else {
    // 지원하지 않는 타입
  }
  return type;
}

/**
 * "inspect" 버튼 클릭 시: 현재 객체의 내용과 root로부터의 경로를 모달에 표시
 * @param {HTMLElement} editor
 */
function inspectObject(editor) {
  const jsonPathStr = getJsonPath(editor);
  const jsonPath = document.getElementById('jsonPath');
  jsonPath.textContent = jsonPathStr;

  const data = collectObjectData(editor);
  const jsonContent = document.getElementById('jsonContent');
  jsonContent.contentEditable = "false";
  jsonContent.innerHTML = syntaxHighlight(data);

  const editButton = document.getElementById('textEditBtn');
  const saveButton = document.getElementById('textSaveBtn');
  const copyButton = document.getElementById('jsonContentCopybtn');

  jsonContent.classList.remove('hidden');
  editButton.classList.remove('hidden');
  saveButton.classList.add('hidden');

  editButton.onclick = () => {
    jsonContent.contentEditable = "true";
    jsonContent.innerHTML = jsonContent.textContent;
    editButton.classList.add('hidden');
    saveButton.classList.remove('hidden');
    copyButton.classList.add('hidden');
  };

  const container = editor.parentElement;
  saveButton.onclick = () => {
    try {
      loadJsonStringToEditor(jsonContent.textContent, container);
    }
    catch (err) {
      return;
    }
    jsonContent.contentEditable = "false";
    const newEditor = container.querySelector('.object-editor');
    const newData = collectObjectData(newEditor);
    jsonContent.innerHTML = syntaxHighlight(newData);
    editButton.classList.remove('hidden');
    saveButton.classList.add('hidden');
    copyButton.classList.remove('hidden');
  };

  document.getElementById('inspectModal').classList.remove("hidden");
}

/**
 * 루트 편집기부터 현재 객체 편집기까지의 경로 반환
 * @param {HTMLElement} editor
 * @returns {String} path
 */
function getJsonPath(editor) {
  const path = [];
  let supContainer = editor?.parentElement?.parentElement;
  while(supContainer) {
    if (supContainer.parentElement?.classList.contains('object-editor')) {
      const keyInput = supContainer.querySelector('.key-input');
      if (keyInput && keyInput.type==='text') {
        let key = keyInput.value;
        if (key === '') {
          key = '(null)';
        }

        const typeSelect = supContainer.querySelector('.type-select');
        if (typeSelect.value === 'array'){
          key += '[]';
        }
        path.push(key);
      }
    }
    supContainer = supContainer?.parentElement?.parentElement?.parentElement;
  }
  const rootKeyword = '{Root}';
  path.push(rootKeyword);
  return path.reverse().join('.');
}

/**
 * 대상이 되는 HTML 요소 중앙에 메시지 표출
 * @param {HTMLElement} container
 */
function showMessage(container, messageStr) {
  const message = document.createElement('div');
  message.className = 'msg';
  message.innerText  = messageStr;
  container.appendChild(message);
  message.classList.add("show");
  setTimeout(() => message.remove(), 500);
}

function syntaxHighlight(json) {
  if (typeof json !== "string") {
      json = JSON.stringify(json, null, 2);
  }
  json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return json.replace(/("(.*?)")|(\b(true|false|null)\b)|(\d+(\.\d+)?)/g, function (match) {
      let cls = "json-number";
      if (/^"/.test(match)) {
          cls = /:$/.test(match) ? "json-key" : "json-string";
      } else if (/true|false/.test(match)) {
          cls = "json-boolean";
      } else if (/null/.test(match)) {
          cls = "json-null";
      }
      return `<span class="${cls}">${match}</span>`;
  });
}
