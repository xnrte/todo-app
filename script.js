/* ==========================================================================
   CONFIG
   ========================================================================== */
const STORAGE_KEY = "todo-app.tasks.v1";
const ENTER_ANIMATION_CLASS = "task--entering";
const REMOVE_ANIMATION_CLASS = "task--removing";
const SHAKE_CLASS = "input--shake";
const ERROR_CLASS = "input--error";
const ERROR_VISIBLE_CLASS = "input-error--visible";
const RIPPLE_CLASS = "btn-add--ripple";
const COMPLETED_CLASS = "task--completed";
const REMOVE_DURATION_MS = 300;

/* ==========================================================================
   DOM REFERENCES
   ========================================================================== */
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const countLabel = document.getElementById("task-count");
const errorLabel = document.getElementById("input-error");

/* ==========================================================================
   STATE
   ========================================================================== */
let tasks = [];

/* ==========================================================================
   STORAGE
   ========================================================================== */
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Could not read tasks from localStorage:", err);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.warn("Could not save tasks to localStorage:", err);
  }
}

/* ==========================================================================
   HELPERS
   ========================================================================== */
function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function updateMeta() {
  const remaining = tasks.filter((t) => !t.completed).length;
  const total = tasks.length;
  countLabel.textContent =
    total === 0
      ? "0 tasks"
      : `${remaining} of ${total} remaining`;
  emptyState.classList.toggle("empty-state--hidden", total > 0);
}

function showError(message) {
  errorLabel.textContent = message;
  errorLabel.classList.add(ERROR_VISIBLE_CLASS);
  input.classList.add(ERROR_CLASS);
  input.setAttribute("aria-invalid", "true");
}

function clearError() {
  errorLabel.classList.remove(ERROR_VISIBLE_CLASS);
  input.classList.remove(ERROR_CLASS);
  input.removeAttribute("aria-invalid");
}

function shakeInput() {
  input.classList.remove(SHAKE_CLASS);
  // Force reflow so the animation restarts on repeated invalid submits
  void input.offsetWidth;
  input.classList.add(SHAKE_CLASS);
  input.addEventListener(
    "animationend",
    () => input.classList.remove(SHAKE_CLASS),
    { once: true }
  );
}

function triggerRipple() {
  addBtn.classList.remove(RIPPLE_CLASS);
  void addBtn.offsetWidth;
  addBtn.classList.add(RIPPLE_CLASS);
  addBtn.addEventListener(
    "animationend",
    () => addBtn.classList.remove(RIPPLE_CLASS),
    { once: true }
  );
}

/* ==========================================================================
   SVG TEMPLATES
   ========================================================================== */
const CHECK_ICON_SVG = `
  <svg class="task__checkbox-icon" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" />
  </svg>`;

const DELETE_ICON_SVG = `
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"
       stroke-linecap="round" aria-hidden="true">
    <path d="M4 4 L12 12 M12 4 L4 12" />
  </svg>`;

/* ==========================================================================
   RENDERING
   ========================================================================== */
function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task";
  li.dataset.id = task.id;
  if (task.completed) li.classList.add(COMPLETED_CLASS);

  // Checkbox (real button with accessible state)
  const checkbox = document.createElement("button");
  checkbox.type = "button";
  checkbox.className = "task__checkbox";
  checkbox.setAttribute("role", "checkbox");
  checkbox.setAttribute("aria-checked", String(task.completed));
  checkbox.setAttribute("aria-label", `Mark "${task.text}" as ${task.completed ? "incomplete" : "complete"}`);
  checkbox.innerHTML = `<span class="task__checkbox-fill" aria-hidden="true"></span>${CHECK_ICON_SVG}`;

  // Text
  const text = document.createElement("span");
  text.className = "task__text";
  text.textContent = task.text;

  // Delete
  const del = document.createElement("button");
  del.type = "button";
  del.className = "task__delete";
  del.setAttribute("aria-label", `Delete task: ${task.text}`);
  del.innerHTML = DELETE_ICON_SVG;

  li.append(checkbox, text, del);

  return li;
}

function render({ animateId = null } = {}) {
  list.innerHTML = "";
  tasks.forEach((task) => {
    const el = createTaskElement(task);
    if (task.id === animateId) {
      el.classList.add(ENTER_ANIMATION_CLASS);
      el.addEventListener(
        "animationend",
        () => el.classList.remove(ENTER_ANIMATION_CLASS),
        { once: true }
      );
    }
    list.appendChild(el);
  });
  updateMeta();
}

/* Update a single task's visual state without re-rendering the whole list */
function updateTaskElement(id) {
  const task = tasks.find((t) => t.id === id);
  const li = list.querySelector(`[data-id="${id}"]`);
  if (!task || !li) return;

  li.classList.toggle(COMPLETED_CLASS, task.completed);
  const checkbox = li.querySelector(".task__checkbox");
  checkbox.setAttribute("aria-checked", String(task.completed));
  checkbox.setAttribute(
    "aria-label",
    `Mark "${task.text}" as ${task.completed ? "incomplete" : "complete"}`
  );
}

/* ==========================================================================
   ACTIONS
   ========================================================================== */
function addTask(text) {
  const newTask = {
    id: generateId(),
    text,
    completed: false,
    createdAt: Date.now(),
  };
  tasks.push(newTask);
  saveTasks();
  render({ animateId: newTask.id });
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  updateTaskElement(id);
  updateMeta();
}

function removeTask(id) {
  const li = list.querySelector(`[data-id="${id}"]`);
  if (!li) return;

  // Animate out, then remove from state and DOM
  li.classList.add(REMOVE_ANIMATION_CLASS);
  setTimeout(() => {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    li.remove();
    updateMeta();
  }, REMOVE_DURATION_MS);
}

/* ==========================================================================
   EVENT HANDLERS
   ========================================================================== */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = input.value.trim();

  if (!value) {
    showError("Please enter a task before adding.");
    shakeInput();
    input.focus();
    return;
  }

  clearError();
  addTask(value);
  triggerRipple();
  input.value = "";
  input.focus();
});

// Clear error state as soon as the user starts typing again
input.addEventListener("input", () => {
  if (input.classList.contains(ERROR_CLASS)) clearError();
});

// Event delegation for checkbox and delete buttons
list.addEventListener("click", (e) => {
  const li = e.target.closest(".task");
  if (!li) return;
  const id = li.dataset.id;

  if (e.target.closest(".task__checkbox")) {
    toggleTask(id);
  } else if (e.target.closest(".task__delete")) {
    removeTask(id);
  }
});

/* ==========================================================================
   INIT
   ========================================================================== */
function init() {
  tasks = loadTasks();
  render();
}

init();
