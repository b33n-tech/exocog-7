// ---------- Stack 1 ----------
const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const archiveBtn = document.getElementById("archiveBtn");
const tasksContainer = document.getElementById("tasksContainer");
const promptsContainer = document.getElementById("promptsContainer");
const clearBtn = document.getElementById("clearBtn");
const llmSelect = document.getElementById("llmSelect");
const pasteJson = document.getElementById("pasteJson");
const pushToStack2Btn = document.getElementById("pushToStack2Btn");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

function formatDate(iso){
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function renderTasks() {
  tasksContainer.innerHTML = "";
  tasks.slice().sort((a,b)=> new Date(a.date)-new Date(b.date)).forEach(task=>{
    const li = document.createElement("li");
    li.className = "task-item";

    const taskText = document.createElement("div");
    taskText.textContent = task.text;
    li.appendChild(taskText);

    const commentBlock = document.createElement("div");
    commentBlock.className = "comment-section";
    const commentList = document.createElement("ul");
    if(task.comments?.length){
      task.comments.forEach(c=>{
        const cLi = document.createElement("li");
        cLi.textContent = `[${formatDate(c.date)}] ${c.text}`;
        commentList.appendChild(cLi);
      });
    }
    commentBlock.appendChild(commentList);

    const commentInputDiv = document.createElement("div");
    const commentInput = document.createElement("input");
    commentInput.placeholder="Ajouter un commentaire…";
    const commentBtn = document.createElement("button");
    commentBtn.textContent="+";
    commentBtn.addEventListener("click", ()=>{
      if(commentInput.value.trim()!==""){
        if(!task.comments) task.comments=[];
        task.comments.push({text: commentInput.value, date: new Date().toISOString()});
        localStorage.setItem("tasks", JSON.stringify(tasks));
        commentInput.value="";
        renderTasks();
      }
    });
    commentInputDiv.appendChild(commentInput);
    commentInputDiv.appendChild(commentBtn);
    commentBlock.appendChild(commentInputDiv);

    li.appendChild(commentBlock);

    taskText.addEventListener("click", ()=>{
      commentBlock.style.display = commentBlock.style.display==="flex"?"none":"flex";
    });

    tasksContainer.appendChild(li);
  });
}

addBtn.addEventListener("click", ()=>{
  if(taskInput.value.trim()!==""){
    tasks.push({text:taskInput.value,date:new Date().toISOString(),comments:[]});
    localStorage.setItem("tasks", JSON.stringify(tasks));
    taskInput.value="";
    renderTasks();
  }
});

archiveBtn.addEventListener("click", ()=>{
  if(tasks.length===0) return alert("Aucune tâche à archiver !");
  const blob = new Blob([JSON.stringify(tasks,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url;
  a.download=`taches_${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

clearBtn.addEventListener("click", ()=>{
  if(confirm("Es-tu sûr ? Cette action est irréversible !")){
    tasks=[];
    localStorage.removeItem("tasks");
    renderTasks();
  }
});

const prompts = [
  {label:"Plan", text:"Transforme ces tâches en plan structuré étape par étape :"},
  {label:"Priorité", text:"Classe ces tâches par ordre de priorité et urgence :"},
  {label:"Catégories", text:"Range ces tâches dans des catégories logiques :"}
];

prompts.forEach(p=>{
  const btn = document.createElement("button");
  btn.textContent=p.label;
  btn.addEventListener("click", ()=>{
    const combined = p.text + "\n\n" + tasks.map(t=>{
      let str = "- "+t.text;
      if(t.comments?.length){
        str += "\n  Commentaires:\n"+t.comments.map(c=>`    - [${formatDate(c.date)}] ${c.text}`).join("\n");
      }
      return str;
    }).join("\n");
    navigator.clipboard.writeText(combined);
    window.open(llmSelect.value,"_blank");
  });
  promptsContainer.appendChild(btn);
});

// ---------- Stack 2 ----------
const jalonsList = document.getElementById("jalonsList");
const messagesTable = document.getElementById("messagesTable");
const livrablesList = document.getElementById("livrablesList");

const mailPromptSelect = document.getElementById("mailPromptSelect");
const livrablePromptSelect = document.getElementById("livrablePromptSelect");
const sendMessagesLLMBtn = document.getElementById("sendMessagesLLMBtn");
const sendLivrablesLLMBtn = document.getElementById("sendLivrablesLLMBtn");

let stack2Data = {jalons:[], messages:[], livrables:[]};

// Push JSON vers stack2
pushToStack2Btn.addEventListener("click", ()=>{
  try{
    const data = JSON.parse(pasteJson.value);
    stack2Data = data;
    renderStack2Modules();
  }catch(err){
    alert("JSON invalide !");
    console.error(err);
  }
});

function renderStack2Modules(){
  // Jalons
  jalonsList.innerHTML="";
  (stack2Data.jalons||[]).forEach(j=>{
    const li = document.createElement("li");
    li.textContent = j.titre + " (" + (j.datePrévue||"") + ")";
    jalonsList.appendChild(li);
  });

  // Messages
  messagesTable.innerHTML="";
  (stack2Data.messages||[]).forEach(m=>{
    const tr = document.createElement("tr");
    const tdCheck = document.createElement("td");
    const cb = document.createElement("input");
    cb.type="checkbox";
    tdCheck.appendChild(cb);
    tr.appendChild(tdCheck);
    tr.appendChild(document.createElement("td")).textContent=m.destinataire;
    tr.appendChild(document.createElement("td")).textContent=m.sujet;
    tr.appendChild(document.createElement("td")).textContent=m.texte;
    const tdNote = document.createElement("td");
    const noteInput = document.createElement("input");
    tdNote.appendChild(noteInput);
    tr.appendChild(tdNote);
    messagesTable.appendChild(tr);
  });

  // Livrables
  livrablesList.innerHTML="";
  (stack2Data.livrables||[]).forEach(l=>{
    const li = document.createElement("li");
    const cb = document.createElement("input");
    cb.type="checkbox";
    li.appendChild(cb);
    li.appendChild(document.createTextNode(` ${l.titre} (${l.type})`));
    const noteInput = document.createElement("input");
    noteInput.placeholder="Note/commentaire…";
    li.appendChild(noteInput);
    livrablesList.appendChild(li);
  });
}

sendMessagesLLMBtn.addEventListener("click", ()=>{
  const selected = Array.from(messagesTable.querySelectorAll("tr")).filter(r=>r.querySelector("input[type=checkbox]").checked);
  if(selected.length===0) return alert("Coche au moins un message !");
  const promptTexte = mailPromptSelect.value==1?"Rédige un email professionnel clair :":"Rédige un email amical :";
  const content = selected.map(tr=>{
    const dest = tr.children[1].textContent;
    const sujet = tr.children[2].textContent;
    const texte = tr.children[3].textContent;
    const note = tr.children[4].querySelector("input").value;
    return note?`À: ${dest}\nSujet: ${sujet}\nMessage: ${texte}\nNote: ${note}`:`À: ${dest}\nSujet: ${sujet}\nMessage: ${texte}`;
  }).join("\n\n");
  navigator.clipboard.writeText(promptTexte+"\n\n"+content);
  window.open(llmSelect.value,"_blank");
});

sendLivrablesLLMBtn.addEventListener("click", ()=>{
  const selected = Array.from(livrablesList.querySelectorAll("li")).filter(li=>li.querySelector("input[type=checkbox]").checked);
  if(selected.length===0) return alert("Coche au moins un livrable !");
  const promptTexte = livrablePromptSelect.value==1?"Génère plan détaillé :":livrablePromptSelect.value==2?"Génère résumé exécutif :":"Génère checklist rapide :";
  const content = selected.map(li=>{
    const title = li.childNodes[1].textContent;
    const note = li.childNodes[2].value;
    return note?`${title}\nNote: ${note}`:title;
  }).join("\n\n");
  navigator.clipboard.writeText(promptTexte+"\n\n"+content);
  window.open(llmSelect.value,"_blank");
});

// Initial render
renderTasks();
