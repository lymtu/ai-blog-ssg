import { html, LitElement, unsafeCSS } from "lit";
import StyleInline from "./style.css?inline";

class Typewriter extends LitElement {
  static properties = {
    text: { type: String },
    taskIndex: { type: Number },
  };

  constructor() {
    super();
    this.text = "";
    this.taskIndex = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    this._executeTask(taskList[this.taskIndex]);
  }

  _executeTask(task) {
    new Promise((resolve) => {
      switch (task.type) {
        case `type`:
          this._typeTask(task, resolve);
          break;
        case `delete`:
          this._deleteTask(task, resolve);
          break;
        case `delay`:
          setTimeout(() => {
            resolve();
          }, task.timeout || 1000);
          break;
        default:
          resolve();
      }
    }).then(() => {
      this._nextTask();
    });
  }

  _nextTask() {
    this.taskIndex++;
    if (this.taskIndex >= taskList.length) {
      this.taskIndex = 0;
    }
    this._executeTask(taskList[this.taskIndex]);
  }

  _typeTask(task, callback) {
    let index = 0;
    const interval = setInterval(() => {
      this.text += task.content[index];
      index++;
      if (index >= task.content.length) {
        clearInterval(interval);
        callback();
      }
    }, 250);
  }

  _deleteTask(task, callback) {
    let index = 0;
    const count = task.count || this.text.length;
    const interval = setInterval(() => {
      this.text = this.text.slice(0, -1);
      index++;
      if (index >= count) {
        clearInterval(interval);
        callback();
      }
    }, 100);
  }

  render() {
    return html`
      <pre class="container">
        ${this.text}<span class="cursor">|</span>
      </pre>
    `;
  }

  static styles = unsafeCSS(StyleInline);
}

const taskList = [
  { type: `delay`, timeout: 1000 },
  { type: `type`, content: `✌️,这是我的个人博客,` },
  { type: `delay`, timeout: 2000 },
  {
    type: `type`,
    content: `
记录一些杂七杂八的东西,`,
  },
  { type: `delay`, timeout: 1000 },
  {
    type: `type`,
    content: `
比如: 技术分享`,
  },
  { type: `delay`, timeout: 1500 },
  { type: `delete`, count: 4 },
  { type: `type`, content: `心得` },
  { type: `delay`, timeout: 1500 },
  { type: `delete`, count: 2 },
  { type: `delay`, timeout: 1000 },
  { type: `delete`, count: 17 },
  { type: `type`, content: `欢迎您的访问` },
  { type: `delay`, timeout: 5000 },
  { type: `delete` },
  { type: `delay`, timeout: 2000 },
];

window.customElements.define(`my-typewriter`, Typewriter);
