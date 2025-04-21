// table.js

// --- helpers ---
function toExp(v)        { return Math.log2(v); }
function fromExp(e)      { return Math.pow(2, e); }
function niceExpFloor(v) { return Math.floor(toExp(v)); }
function niceExpCeil(v)  { return Math.ceil(toExp(v)); }

/* e.g. 1e6→"1 M", 1e3→"1 k" */
function human(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/, "") + " M";
  if (n >= 1e3) return (n/1e3).toFixed(1).replace(/\.0$/, "") + " k";
  return n.toString();
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

document.addEventListener("DOMContentLoaded", () => {
  // grab elements
  const tableBody           = document.querySelector("#performance-table tbody");
  const categoryFilter      = document.getElementById("category-filter");
  const paginationContainer = document.getElementById("pagination");
  const toggleButton        = document.getElementById("toggle-filters");
  const filterContainer     = document.getElementById("filter-container");
  const rowsPerPageInput    = document.getElementById("rows-per-page");
  const copyBtn             = document.getElementById("copy-permalink");
  const copyFeedback        = document.getElementById("copy-feedback");
  const resetBtn            = document.getElementById("reset-filters");
  const searchInput = document.getElementById("problem-search");

  const [ nzMinS, nzMaxS ]     = ["nonzero-range-min","nonzero-range-max"]
                                  .map(id=>document.getElementById(id));
  const [ degMinS, degMaxS ]   = ["degree-range-min","degree-range-max"]
                                  .map(id=>document.getElementById(id));
  const [ rowsMinS, rowsMaxS ] = ["rows-range-min","rows-range-max"]
                                  .map(id=>document.getElementById(id));
  const [ nzD, degD, rowsD ]   = [
    "nonzero-range-display",
    "degree-range-display",
    "rows-range-display"
  ].map(id=>document.getElementById(id));

  // state
  let currentPage       = 1;
  let rowsPerPage       = parseInt(rowsPerPageInput.value,10) || 25;
  let currentSortColumn = "problem";
  let currentSortOrder  = "asc";

  // fetch data
  fetch("/assets/data/performance.json")
    .then(r => r.json())
    .then(data => {
      // compute raw bounds
      const nzVals   = data.map(d=>d.nonzeros);
      const degVals  = data.map(d=>d.avg_degree);
      const rowsVals = data.map(d=>d.rows);

      const nzMin   = Math.min(...nzVals),   nzMax   = Math.max(...nzVals);
      const degMin  = Math.min(...degVals),  degMax  = Math.max(...degVals);
      const rowsMin = Math.min(...rowsVals), rowsMax = Math.max(...rowsVals);

      // exponent‐slider bounds
      const ezMin = niceExpFloor(nzMin), ezMax = niceExpCeil(nzMax);
      const erMin = niceExpFloor(rowsMin), erMax = niceExpCeil(rowsMax);

      // capture defaults for reset
      const defaults = {
        ezMin, ezMax,
        degMin, degMax,
        erMin, erMax,
        perPage: rowsPerPage,
        sortCol: currentSortColumn,
        sortOrder: currentSortOrder
      };

      // init sliders
      nzMinS.min = ezMin; nzMinS.max = ezMax; nzMinS.step = .25; nzMinS.value = ezMin;
      nzMaxS.min = ezMin; nzMaxS.max = ezMax; nzMaxS.step = .25; nzMaxS.value = ezMax;
      rowsMinS.min = erMin; rowsMinS.max = erMax; rowsMinS.step = .25; rowsMinS.value = erMin;
      rowsMaxS.min = erMin; rowsMaxS.max = erMax; rowsMaxS.step = .25; rowsMaxS.value = erMax;
      degMinS.min = degMin; degMinS.max = degMax; degMinS.value = degMin;
      degMaxS.min = degMin; degMaxS.max = degMax; degMaxS.value = degMax;

      // update text displays
      function updateRangeDisplays() {
        const a = clamp(fromExp(+nzMinS.value), nzMin, nzMax),
              b = clamp(fromExp(+nzMaxS.value), nzMin, nzMax);
        nzD.textContent = `${human(a)} – ${human(b)}`;
        const c = +degMinS.value, d = +degMaxS.value;
        degD.textContent = `${c.toFixed(2)} – ${d.toFixed(2)}`;
        const e = clamp(fromExp(+rowsMinS.value), rowsMin, rowsMax),
              f = clamp(fromExp(+rowsMaxS.value), rowsMin, rowsMax);
        rowsD.textContent = `${human(e)} – ${human(f)}`;
      }

      function getFilteredData() {
        const q = searchInput.value.trim().toLowerCase();
      
        const a   = clamp(fromExp(+nzMinS.value),   nzMin,   nzMax),
              b   = clamp(fromExp(+nzMaxS.value),   nzMin,   nzMax),
              c   = +degMinS.value,
              d   = +degMaxS.value,
              e   = clamp(fromExp(+rowsMinS.value), rowsMin, rowsMax),
              f   = clamp(fromExp(+rowsMaxS.value), rowsMin, rowsMax),
              cat = categoryFilter.value;
      
        return data
          .filter(entry => {
            // slider‐based filters
            const inRange =
              entry.nonzeros   >= a && entry.nonzeros   <= b &&
              entry.avg_degree >= c && entry.avg_degree <= d &&
              entry.rows       >= e && entry.rows       <= f;
      
            // category filter (empty = all)
            const inCategory = !cat || entry.category === cat;
      
            // search filter (case‐insensitive partial match)
            const inSearch = !q || entry.problem.toLowerCase().includes(q);
      
            return inRange && inCategory && inSearch;
          })
          .sort((u, v) => {
            const uv = u[currentSortColumn],
                  vv = v[currentSortColumn];
            if (typeof uv === "number") {
              return currentSortOrder === "asc" ? uv - vv : vv - uv;
            }
            return currentSortOrder === "asc"
              ? String(uv).localeCompare(vv)
              : String(vv).localeCompare(uv);
          });
      }

      // render rows
      function renderTable(fd) {
        tableBody.innerHTML = "";
        const start = (currentPage-1)*rowsPerPage,
              slice = fd.slice(start, start+rowsPerPage);
        slice.forEach(entry => {
          const tr = document.createElement("tr");

          // problem
          const tdP = document.createElement("td"),
                a   = document.createElement("a");
          a.href = "#"; a.className = "problem-link";
          a.dataset.image = entry.image;
          a.textContent   = entry.problem;
          tdP.appendChild(a);

          // nonzeros
          const tdN = document.createElement("td"),
                sN  = document.createElement("span");
          sN.className      = "toggle-numeric";
          sN.dataset.full  = entry.nonzeros;
          sN.dataset.human = human(entry.nonzeros);
          sN.textContent   = human(entry.nonzeros);
          tdN.appendChild(sN);

          // avg_degree
          const tdD = document.createElement("td");
          tdD.textContent = entry.avg_degree.toFixed(2);

          // rows
          const tdR = document.createElement("td"),
                sR  = document.createElement("span");
          sR.className      = "toggle-numeric";
          sR.dataset.full  = entry.rows;
          sR.dataset.human = human(entry.rows);
          sR.textContent   = human(entry.rows);
          tdR.appendChild(sR);

          // category
          const tdC = document.createElement("td");
          tdC.textContent = entry.category;

          tr.append(tdP, tdN, tdD, tdR, tdC);
          tableBody.appendChild(tr);
        });
      }

      // render pagination
      function renderPagination(fd) {
        paginationContainer.innerHTML = "";
        const totalPages = Math.ceil(fd.length/rowsPerPage);
        if (totalPages <= 1) return;

        const prev = document.createElement("button");
        prev.textContent = "Previous";
        prev.disabled = currentPage===1;
        prev.addEventListener("click", () => {
          currentPage--; updateView();
        });
        paginationContainer.appendChild(prev);

        for (let i=1; i<=totalPages; i++) {
          const btn = document.createElement("button");
          btn.textContent = i;
          if (i===currentPage) btn.style.fontWeight = "bold";
          btn.addEventListener("click", () => {
            currentPage = i; updateView();
          });
          paginationContainer.appendChild(btn);
        }

        const next = document.createElement("button");
        next.textContent = "Next";
        next.disabled = currentPage===totalPages;
        next.addEventListener("click", () => {
          currentPage++; updateView();
        });
        paginationContainer.appendChild(next);
      }

      // full refresh
      function updateView() {
        updateRangeDisplays();
        const fd = getFilteredData();
        renderTable(fd);
        renderPagination(fd);
      }

      // attach controls
      [nzMinS,nzMaxS,degMinS,degMaxS,rowsMinS,rowsMaxS]
        .forEach(el => el.addEventListener("input", () => {
          currentPage = 1; updateView();
        }));


      function attachPushOff(minSlider, maxSlider, onChange) {
        // drag left thumb
        minSlider.addEventListener("input", () => {
          const min = +minSlider.value;
          if (min > +maxSlider.value) maxSlider.value = min;
          onChange();
        });
        // drag right thumb
        maxSlider.addEventListener("input", () => {
          const max = +maxSlider.value;
          if (max < +minSlider.value) minSlider.value = max;
          onChange();
        });
      }

      attachPushOff(nzMinS,   nzMaxS,   () => { currentPage = 1; updateView(); });
      attachPushOff(degMinS,  degMaxS,  () => { currentPage = 1; updateView(); });
      attachPushOff(rowsMinS, rowsMaxS, () => { currentPage = 1; updateView(); });

      categoryFilter.addEventListener("change", () => {
        currentPage = 1; updateView();
      });

      searchInput.addEventListener("input", () => {
        currentPage = 1;
        updateView();
      });

      rowsPerPageInput.max = data.length;
      rowsPerPageInput.addEventListener("change", () => {
        let v = parseInt(rowsPerPageInput.value,10) || 1;
        rowsPerPage = clamp(v,1,data.length);
        rowsPerPageInput.value = rowsPerPage;
        currentPage = 1; updateView();
      });

      document.querySelectorAll(".sortable").forEach(hdr => {
        let arrow = hdr.querySelector(".sort-arrow");
        if (!arrow) {
          arrow = document.createElement("span");
          arrow.className = "sort-arrow";
          hdr.appendChild(arrow);
        }
        hdr.addEventListener("click", () => {
          const key = hdr.dataset.sort;
          if (currentSortColumn === key) {
            currentSortOrder = currentSortOrder==="asc"? "desc":"asc";
          } else {
            currentSortColumn = key;
            currentSortOrder  = "asc";
          }
          document.querySelectorAll(".sort-arrow")
            .forEach(a => a.textContent = " →");
          hdr.querySelector(".sort-arrow")
            .textContent = currentSortOrder==="asc"? " ↑":" ↓";
          currentPage = 1; updateView();
        });
      });

      // delegated clicks: toggle-numeric & problem-link
      tableBody.addEventListener("click", e => {
        const span = e.target.closest(".toggle-numeric");
        if (span) {
          const full = span.dataset.full;
          span.textContent = (span.textContent === full
            ? span.dataset.human
            : full);
          return;
        }
        const link = e.target.closest(".problem-link");
        if (!link) return;
        e.preventDefault();

        const tr = link.closest("tr"),
              next = tr.nextElementSibling,
              imgURL = link.dataset.image;

        if (next && next.classList.contains("details-row")) {
          const w = next.querySelector(".details-wrapper"),
                h0 = w.getBoundingClientRect().height;
          w.style.maxHeight = h0 + "px"; w.offsetHeight; w.style.maxHeight = "0";
          w.addEventListener("transitionend", ev => {
            if (ev.propertyName==="max-height") next.remove();
          }, { once:true });
          return;
        }

        document.querySelectorAll(".details-row").forEach(r => {
          const w = r.querySelector(".details-wrapper"),
                h0 = w.getBoundingClientRect().height;
          w.style.maxHeight = h0 + "px"; w.offsetHeight; w.style.maxHeight = "0";
          w.addEventListener("transitionend", () => r.remove(), { once:true });
        });

        const dr = document.createElement("tr");
        dr.className = "details-row";
        dr.innerHTML = `
          <td colspan="5">
            <div class="details-wrapper">
              <img src="${imgURL}" alt="" style="display:block;max-width:80%;margin:10px auto;">
            </div>
          </td>`;
        tr.after(dr);

        const w = dr.querySelector(".details-wrapper"),
              img = w.querySelector("img");
        img.addEventListener("load", () => {
          w.style.maxHeight = w.scrollHeight + "px";
        });
        w.style.maxHeight = "0"; w.offsetHeight; w.style.maxHeight = w.scrollHeight + "px";
      });

      // copy‑permalink
      copyBtn.addEventListener("click", () => {
        const params = new URLSearchParams();
        if (categoryFilter.value) params.set("cat", categoryFilter.value);
        params.set("minNZ", nzMinS.value);
        params.set("maxNZ", nzMaxS.value);
        params.set("minDeg", degMinS.value);
        params.set("maxDeg", degMaxS.value);
        params.set("minR", rowsMinS.value);
        params.set("maxR", rowsMaxS.value);
        params.set("page", currentPage);
        params.set("pp", rowsPerPage);
        params.set("sort", currentSortColumn);
        params.set("order", currentSortOrder);
        params.set("q", searchInput.value);

        const url = `${location.origin}${location.pathname}?${params}`;
        navigator.clipboard.writeText(url).then(() => {
          copyFeedback.style.opacity = 1;
          setTimeout(() => copyFeedback.style.opacity = 0, 1500);
        }).catch(() => {
          copyFeedback.textContent = "⚠️ Failed to copy";
          copyFeedback.style.opacity = 1;
        });
      });

      // reset‑filters
      resetBtn.addEventListener("click", () => {
        history.replaceState(null, "", location.pathname);

        categoryFilter.value   = "";
        nzMinS.value           = defaults.ezMin;
        nzMaxS.value           = defaults.ezMax;
        degMinS.value          = defaults.degMin;
        degMaxS.value          = defaults.degMax;
        rowsMinS.value         = defaults.erMin;
        rowsMaxS.value         = defaults.erMax;
        rowsPerPageInput.value = defaults.perPage;
        currentPage            = 1;
        currentSortColumn      = defaults.sortCol;
        currentSortOrder       = defaults.sortOrder;
        searchInput.value = "";

        // reset sort arrows
        document.querySelectorAll(".sort-arrow")
          .forEach(a => a.textContent = " →");
        document.querySelector(`.sortable[data-sort="${currentSortColumn}"] .sort-arrow`)
          .textContent = " ↑";

        updateView();
      });

      // toggle filters panel
      toggleButton.addEventListener("click", () => {
        const open = !filterContainer.style.maxHeight || filterContainer.style.maxHeight==="0px";
        filterContainer.style.maxHeight = open? "400px" : "0px";
        toggleButton.textContent = open? "Hide Filters ↑" : "Show Filters ↓";
      });

      // populate categories
      categoryFilter.innerHTML = `<option value="">All categories</option>`;
      Array.from(new Set(data.map(d => d.category))).forEach(cat => {
        const opt = document.createElement("option");
        opt.value = opt.textContent = cat;
        categoryFilter.appendChild(opt);
      });

      // rehydrate URL state
      const params = new URLSearchParams(location.search);
      if (params.has("cat"))   categoryFilter.value = params.get("cat");
      if (params.has("minNZ")) nzMinS.value      = params.get("minNZ");
      if (params.has("maxNZ")) nzMaxS.value      = params.get("maxNZ");
      if (params.has("minDeg"))degMinS.value     = params.get("minDeg");
      if (params.has("maxDeg"))degMaxS.value     = params.get("maxDeg");
      if (params.has("minR"))  rowsMinS.value    = params.get("minR");
      if (params.has("maxR"))  rowsMaxS.value    = params.get("maxR");
      if (params.has("page"))  currentPage       = +params.get("page");
      if (params.has("pp"))    rowsPerPage       = +params.get("pp");
      if (params.has("sort"))  currentSortColumn = params.get("sort");
      if (params.has("order")) currentSortOrder  = params.get("order");
      if (params.has("q"))  searchInput.value = params.get("q");

      // initial render
      updateView();

      // restore sort arrows
      document.querySelectorAll(".sortable").forEach(hdr => {
        const arrow = hdr.querySelector(".sort-arrow");
        arrow.textContent = (hdr.dataset.sort === currentSortColumn)
          ? (currentSortOrder==="asc" ? " ↑" : " ↓")
          : " →";
      });
    });
});