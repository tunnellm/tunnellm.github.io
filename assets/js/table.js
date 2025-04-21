// --- helpers ---
function toExp(v)      { return Math.log2(v); }
function fromExp(e)    { return Math.pow(2, e); }
function niceExpFloor(v){ return Math.floor(toExp(v)); }
function niceExpCeil(v) { return Math.ceil(toExp(v)); }

/* human-readable e.g. 1e6→"1 M", 1e3→"1 k" */
function human(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/, "") + " M";
  if (n >= 1e3) return (n/1e3).toFixed(1).replace(/\.0$/, "") + " k";
  return n.toString();
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// --- main ---
document.addEventListener("DOMContentLoaded", () => {
  fetch("/assets/data/performance.json")
    .then(r => r.json())
    .then(data => {
      // elements
      const tableBody         = document.querySelector("#performance-table tbody");
      const categoryFilter    = document.getElementById("category-filter");
      const paginationContainer = document.getElementById("pagination");
      const toggleButton      = document.getElementById("toggle-filters");
      const filterContainer   = document.getElementById("filter-container");
      const rowsPerPageInput  = document.getElementById("rows-per-page");

      // slider elems & displays
      const [ nzMinS, nzMaxS ]   = [ "nonzero-range-min", "nonzero-range-max" ].map(id=>document.getElementById(id));
      const [ degMinS, degMaxS ] = [ "degree-range-min",    "degree-range-max" ].map(id=>document.getElementById(id));
      const [ rowsMinS, rowsMaxS ] = [ "rows-range-min",     "rows-range-max" ].map(id=>document.getElementById(id));
      const [ nzD, degD, rowsD ] = [ "nonzero-range-display","degree-range-display","rows-range-display" ]
                                     .map(id=>document.getElementById(id));

      // compute data bounds
      const nzMin  = Math.min(...data.map(d=>d.nonzeros));
      const nzMax  = Math.max(...data.map(d=>d.nonzeros));
      const degMin = Math.min(...data.map(d=>d.avg_degree));
      const degMax = Math.max(...data.map(d=>d.avg_degree));
      const rowsMin= Math.min(...data.map(d=>d.rows));
      const rowsMax= Math.max(...data.map(d=>d.rows));

      // exponents for log sliders
      const [ ezMin, ezMax ] = [ nzMin, nzMax ].map(niceExpFloor).concat([ nzMax ]).slice(0,2).map((_,i)=> i? niceExpCeil(nzMax): niceExpFloor(nzMin));
      const [ erMin, erMax ] = [ rowsMin, rowsMax ].map(niceExpFloor).concat([ rowsMax ]).slice(0,2).map((_,i)=> i? niceExpCeil(rowsMax): niceExpFloor(rowsMin));

      // init sliders
      nzMinS.min = ezMin; nzMinS.max = ezMax; nzMinS.step = .25; nzMinS.value = ezMin;
      nzMaxS.min = ezMin; nzMaxS.max = ezMax; nzMaxS.step = .25; nzMaxS.value = ezMax;
      rowsMinS.min = erMin; rowsMinS.max = erMax; rowsMinS.step = .25; rowsMinS.value = erMin;
      rowsMaxS.min = erMin; rowsMaxS.max = erMax; rowsMaxS.step = .25; rowsMaxS.value = erMax;
      degMinS.min=degMin; degMinS.max=degMax; degMinS.value=degMin;
      degMaxS.min=degMin; degMaxS.max=degMax; degMaxS.value=degMax;

      // initial range displays
      nzD.textContent   = `${human(clamp(fromExp(ezMin), nzMin, nzMax))} – ${human(clamp(fromExp(ezMax), nzMin, nzMax))}`;
      degD.textContent  = `${degMin.toFixed(2)} – ${degMax.toFixed(2)}`;
      rowsD.textContent = `${human(clamp(fromExp(erMin), rowsMin, rowsMax))} – ${human(clamp(fromExp(erMax), rowsMin, rowsMax))}`;

      // toggle filters panel
      toggleButton.addEventListener("click", () => {
        const open = !filterContainer.style.maxHeight || filterContainer.style.maxHeight==="0px";
        filterContainer.style.maxHeight = open? "300px" : "0px";
        toggleButton.textContent = open? "Hide Filters ↑" : "Show Filters ↓";
      });

      // filter logic
      function filterBySliders() {
        let e1 = +nzMinS.value, e2 = +nzMaxS.value;
        let r1 = +rowsMinS.value, r2 = +rowsMaxS.value;
        let d1 = +degMinS.value, d2 = +degMaxS.value;

        if (e1>e2) nzMinS.value=e2;
        if (r1>r2) rowsMinS.value=r2;
        if (d1>d2) degMinS.value=d2;

        const minNZ  = clamp(fromExp(e1), nzMin, nzMax);
        const maxNZ  = clamp(fromExp(e2), nzMin, nzMax);
        const minRows= clamp(fromExp(r1), rowsMin, rowsMax);
        const maxRows= clamp(fromExp(r2), rowsMin, rowsMax);

        nzD.textContent   = `${human(minNZ)} – ${human(maxNZ)}`;
        degD.textContent  = `${d1.toFixed(2)} – ${d2.toFixed(2)}`;
        rowsD.textContent = `${human(minRows)} – ${human(maxRows)}`;

        const fd = data.filter(d =>
          d.nonzeros   >= minNZ   && d.nonzeros   <= maxNZ &&
          d.avg_degree >= d1      && d.avg_degree <= d2    &&
          d.rows       >= minRows && d.rows       <= maxRows
        );
        currentPage = 1;
        updateTableAndPagination(fd);
      }
      [ nzMinS, nzMaxS, degMinS, degMaxS, rowsMinS, rowsMaxS ]
        .forEach(sl=>sl.addEventListener("input",filterBySliders));

      // pagination & sorting defaults
      let currentPage = 1;
      let rowsPerPage = 25;
      let currentSortColumn = "problem";
      let currentSortOrder  = "asc";

      // rows‑per‑page input
      rowsPerPageInput.max = data.length;
      rowsPerPageInput.addEventListener("change", () => {
        let v = parseInt(rowsPerPageInput.value)||1;
        rowsPerPage = clamp(v,1,data.length);
        rowsPerPageInput.value = rowsPerPage;
        currentPage = 1;
        updateTableAndPagination(data);
      });

      // sort initial by problem
      data.sort((a,b)=>a.problem.localeCompare(b.problem));

      // --- delegated click handlers ---

      // 1) human↔full toggle
      tableBody.addEventListener("click", e => {
        const span = e.target.closest(".toggle-numeric");
        if (!span) return;
        const { full, human:hum } = span.dataset;
        span.textContent = (span.textContent === full ? hum : full);
      });

      // 2) image‑drawer for problem-link
      tableBody.addEventListener("click", e => {
        const link = e.target.closest(".problem-link");
        if (!link) return;
        e.preventDefault();

        const tr   = link.closest("tr");
        const next = tr.nextElementSibling;
        const imgURL = link.dataset.image;

        // collapse if open
        if (next && next.classList.contains("details-row")) {
          const w = next.querySelector(".details-wrapper");
          const h0 = w.getBoundingClientRect().height;
          w.style.maxHeight = h0 + "px"; w.offsetHeight; w.style.maxHeight = "0";
          w.addEventListener("transitionend",ev=>{ if(ev.propertyName==="max-height") next.remove(); },{once:true});
          return;
        }

        // close others
        document.querySelectorAll(".details-row").forEach(r=>{
          const w = r.querySelector(".details-wrapper");
          const h0 = w.getBoundingClientRect().height;
          w.style.maxHeight = h0 + "px"; w.offsetHeight; w.style.maxHeight = "0";
          w.addEventListener("transitionend",()=>r.remove(),{once:true});
        });

        // build & open new drawer
        const dr = document.createElement("tr");
        dr.className = "details-row";
        dr.innerHTML = `
          <td colspan="5">
            <div class="details-wrapper">
              <img src="${imgURL}" alt="" style="display:block;max-width:80%;margin:10px auto;">
            </div>
          </td>`;
        tr.after(dr);

        const w = dr.querySelector(".details-wrapper");
        const img = w.querySelector("img");
        img.addEventListener("load",()=> w.style.maxHeight = w.scrollHeight + "px");
        w.style.maxHeight = "0"; w.offsetHeight; w.style.maxHeight = w.scrollHeight + "px";
      });

      // --- rendering & pagination ---
      function renderTable(fd) {
        const total = Math.ceil(fd.length/rowsPerPage);
        if (currentPage>total) currentPage=total;
        if (currentPage<1) currentPage=1;

        const start = (currentPage-1)*rowsPerPage;
        const slice = fd.slice(start, start+rowsPerPage);

        tableBody.innerHTML = "";
        slice.forEach(entry=>{
          const tr = document.createElement("tr");

          // problem
          const tdP = document.createElement("td");
          const a = document.createElement("a");
          a.href="#"; a.className="problem-link";
          a.dataset.details=entry.details;
          a.dataset.image=entry.image;
          a.textContent=entry.problem;
          tdP.appendChild(a);

          // nonzeros
          const tdN = document.createElement("td");
          const sN = document.createElement("span");
          sN.className="toggle-numeric";
          sN.dataset.full=entry.nonzeros;
          sN.dataset.human=human(entry.nonzeros);
          sN.textContent=human(entry.nonzeros);
          tdN.appendChild(sN);

          // avg_degree
          const tdD = document.createElement("td");
          tdD.textContent = entry.avg_degree.toFixed(2);

          // rows
          const tdR = document.createElement("td");
          const sR = document.createElement("span");
          sR.className="toggle-numeric";
          sR.dataset.full=entry.rows;
          sR.dataset.human=human(entry.rows);
          sR.textContent=human(entry.rows);
          tdR.appendChild(sR);

          // category
          const tdC = document.createElement("td");
          tdC.textContent=entry.category;

          tr.append(tdP,tdN,tdD,tdR,tdC);
          tableBody.appendChild(tr);
        });
      }

      function renderPaginationControls(fd, totalPages) {
        paginationContainer.innerHTML="";
        if (totalPages<=1) return;
        const prev = document.createElement("button");
        prev.textContent="Previous"; prev.disabled = currentPage===1;
        prev.addEventListener("click",()=>{ currentPage--; updateTableAndPagination(fd); });
        paginationContainer.appendChild(prev);

        for(let i=1;i<=totalPages;i++){
          const btn=document.createElement("button");
          btn.textContent=i; if(i===currentPage) btn.style.fontWeight="bold";
          btn.addEventListener("click",()=>{ currentPage=i; updateTableAndPagination(fd); });
          paginationContainer.appendChild(btn);
        }

        const next = document.createElement("button");
        next.textContent="Next"; next.disabled=currentPage===totalPages;
        next.addEventListener("click",()=>{ currentPage++; updateTableAndPagination(fd); });
        paginationContainer.appendChild(next);
      }

      function updateTableAndPagination(fd) {
        rowsPerPage = parseInt(rowsPerPageInput.value)||10;
        const tot = Math.ceil(fd.length/rowsPerPage);
        renderTable(fd);
        renderPaginationControls(fd,tot);
      }

      // initial render
      updateTableAndPagination(data);

      // category filter
      Array.from(new Set(data.map(d=>d.category))).forEach(cat=>{
        const o = document.createElement("option");
        o.value=o.textContent=cat;
        categoryFilter.appendChild(o);
      });
      categoryFilter.addEventListener("change",()=>{
        const sel=categoryFilter.value;
        const fd = sel? data.filter(d=>d.category===sel) : data;
        currentPage=1;
        updateTableAndPagination(fd);
      });

      // sorting headers
      document.querySelectorAll(".sortable").forEach(hdr=>{
        let arrow = hdr.querySelector(".sort-arrow");
        if(!arrow){ arrow = document.createElement("span"); arrow.className="sort-arrow"; hdr.appendChild(arrow); }
        hdr.addEventListener("click",function(){
          const key=this.dataset.sort;
          if(currentSortColumn===key) currentSortOrder = currentSortOrder==="asc"? "desc":"asc";
          else { currentSortColumn=key; currentSortOrder="asc"; }
          document.querySelectorAll(".sort-arrow").forEach(a=>a.textContent=" →");
          hdr.querySelector(".sort-arrow").textContent = currentSortOrder==="asc"? " ↑":" ↓";
          data.sort((a,b)=>{
            const av=a[key], bv=b[key];
            if(typeof av==="number") return currentSortOrder==="asc"? av-bv : bv-av;
            return currentSortOrder==="asc"
              ? String(av).localeCompare(bv)
              : String(bv).localeCompare(av);
          });
          currentPage=1;
          updateTableAndPagination(data);
        });
      });

    }); // then(data)
}); // DOMContentLoaded