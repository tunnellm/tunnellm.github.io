function toExp(value)      { return Math.log2(value); }    //  value -> exponent
function fromExp(exponent) { return Math.pow(2, exponent); } // exponent -> value

function niceExpFloor(v) { return Math.floor(toExp(v)); }   // 1270 -> 10  (≈2¹⁰ = 1024)
function niceExpCeil (v) { return Math.ceil (toExp(v)); }   // 531000 -> 20 (≈2²⁰ = 1 048 576)

/* prettier display, e.g. 131072 → "131 k" */
function human(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/, "") + " M";
  if (n >= 1e3) return (n/1e3).toFixed(1).replace(/\.0$/, "") + " k";
  return n.toString();
}

// helpers
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

document.addEventListener("DOMContentLoaded", function () {
    fetch("/assets/data/performance.json")
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector("#performance-table tbody");
            const categoryFilter = document.getElementById("category-filter");
            const paginationContainer = document.getElementById("pagination");
            // const detailsDiv = document.getElementById("details");

            const toggleButton = document.getElementById("toggle-filters");
            const filterContainer = document.getElementById("filter-container");

            toggleButton.addEventListener("click", function () {
                if (filterContainer.style.maxHeight === "0px" || filterContainer.style.maxHeight === "") {
                    filterContainer.style.maxHeight = "300px"; // Adjust height as needed
                    toggleButton.textContent = "Hide Filters ↑";
                } else {
                    filterContainer.style.maxHeight = "0px";
                    toggleButton.textContent = "Show Filters ↓";
                }
            });
            

            const metric1MinSlider = document.getElementById("nonzero-range-min");
            const metric1MaxSlider = document.getElementById("nonzero-range-max");
            const metric2MinSlider = document.getElementById("degree-range-min");
            const metric2MaxSlider = document.getElementById("degree-range-max");
            const metric3MinSlider = document.getElementById("rows-range-min");
            const metric3MaxSlider = document.getElementById("rows-range-max");

            const metric1RangeDisplay = document.getElementById("nonzero-range-display");
            const metric2RangeDisplay = document.getElementById("degree-range-display");
            const metric3RangeDisplay = document.getElementById("rows-range-display");

            let metric1Min, metric1Max, metric2Min, metric2Max, metric3Min, metric3Max;

            // Determine the min/max values in the dataset
            metric1Min = Math.min(...data.map(d => d.nonzeros));
            metric1Max = Math.max(...data.map(d => d.nonzeros));

            metric2Min = Math.min(...data.map(d => d.avg_degree));
            metric2Max = Math.max(...data.map(d => d.avg_degree));

            metric3Min = Math.min(...data.map(d => d.rows));
            metric3Max = Math.max(...data.map(d => d.rows));

            const exp1Min = niceExpFloor(metric1Min);
            const exp1Max = niceExpCeil(metric1Max);

            // Set sliders to these values
            // metric1MinSlider.min = metric1Min;
            // metric1MinSlider.max = metric1Max;
            // metric1MinSlider.value = metric1Min;
            // metric1MaxSlider.min = metric1Min;
            // metric1MaxSlider.max = metric1Max;
            // metric1MaxSlider.value = metric1Max;

            metric1MinSlider.min   = exp1Min;
            metric1MinSlider.max   = exp1Max;
            metric1MinSlider.step  = .25;
            metric1MinSlider.value = exp1Min;

            metric1MaxSlider.min   = exp1Min;
            metric1MaxSlider.max   = exp1Max;
            metric1MaxSlider.step  = .25;
            metric1MaxSlider.value = exp1Max;

            metric2MinSlider.min = metric2Min;
            metric2MinSlider.max = metric2Max;
            metric2MinSlider.value = metric2Min;
            metric2MaxSlider.min = metric2Min;
            metric2MaxSlider.max = metric2Max;
            metric2MaxSlider.value = metric2Max;

            const exp3Min = niceExpFloor(metric3Min);
            const exp3Max = niceExpCeil(metric3Max);

            // metric3MinSlider.min = metric3Min;
            // metric3MinSlider.max = metric3Max;
            // metric3MinSlider.value = metric3Min;
            // metric3MaxSlider.min = metric3Min;
            // metric3MaxSlider.max = metric3Max;
            // metric3MaxSlider.value = metric3Max;

            metric3MinSlider.min   = exp3Min;
            metric3MinSlider.max   = exp3Max;
            metric3MinSlider.step  = .25;
            metric3MinSlider.value = exp3Min;

            metric3MaxSlider.min   = exp3Min;
            metric3MaxSlider.max   = exp3Max;
            metric3MaxSlider.step  = .25;
            metric3MaxSlider.value = exp3Max;

            // Show initial range values
            metric1RangeDisplay.textContent = `${human(clamp(fromExp(exp1Min), metric1Min, metric1Max))} - ${human(clamp(fromExp(exp1Max), metric1Min, metric1Max))}`;
            metric2RangeDisplay.textContent = `${metric2Min.toFixed(2)} - ${metric2Max.toFixed(2)}`;
            metric3RangeDisplay.textContent = `${human(clamp(fromExp(exp3Min), metric3Min, metric3Max))} - ${human(clamp(fromExp(exp3Max), metric3Min, metric3Max))}`;

            function filterBySliders () {
                /* 1. read slider positions (exponents) */
                const expNZmin   = +metric1MinSlider.value;
                const expNZmax   = +metric1MaxSlider.value;
                const expRowsMin = +metric3MinSlider.value;
                const expRowsMax = +metric3MaxSlider.value;
              
                /* 2. exponent → value, then CLAMP to data bounds */
                const minNZ   = clamp(fromExp(expNZmin),   metric1Min, metric1Max);
                const maxNZ   = clamp(fromExp(expNZmax),   metric1Min, metric1Max);
                const minRows = clamp(fromExp(expRowsMin), metric3Min, metric3Max);
                const maxRows = clamp(fromExp(expRowsMax), metric3Min, metric3Max);
              
                /* 3. linear slider (avg‑degree) as before */
                const minDeg  = +metric2MinSlider.value;
                const maxDeg  = +metric2MaxSlider.value;
              
                /* 4. prevent crossing (exponents for log sliders) */
                if (expNZmin   > expNZmax)   metric1MinSlider.value = expNZmax;
                if (expRowsMin > expRowsMax) metric3MinSlider.value = expRowsMax;
                if (minDeg > maxDeg)         metric2MinSlider.value = maxDeg;
              
                /* 5. update read‑outs */
                metric1RangeDisplay.textContent = `${human(minNZ)} – ${human(maxNZ)}`;
                metric2RangeDisplay.textContent = `${minDeg.toFixed(2)} – ${maxDeg.toFixed(2)}`;
                metric3RangeDisplay.textContent = `${human(minRows)} – ${human(maxRows)}`;
              
                /* 6. filter */
                const filteredData = data.filter(entry =>
                  entry.nonzeros  >= minNZ   && entry.nonzeros  <= maxNZ   &&
                  entry.avg_degree>= minDeg  && entry.avg_degree<= maxDeg  &&
                  entry.rows      >= minRows && entry.rows      <= maxRows
                );
              
                currentPage = 1;
                updateTableAndPagination(filteredData);
              }


            // Attach event listeners for both sliders
            metric1MinSlider.addEventListener("input", filterBySliders);
            metric1MaxSlider.addEventListener("input", filterBySliders);
            metric2MinSlider.addEventListener("input", filterBySliders);
            metric2MaxSlider.addEventListener("input", filterBySliders);
            metric3MinSlider.addEventListener("input", filterBySliders);
            metric3MaxSlider.addEventListener("input", filterBySliders);
            

            let currentSortColumn = "problem";
            let currentSortOrder = "asc";

            data.sort((a, b) => a.problem.localeCompare(b.problem));


            let currentPage = 1;
            // const rowsPerPage = 10; // Adjust this value to control how many rows appear per page
            let rowsPerPage = 25; // Default value
            const rowsPerPageInput = document.getElementById("rows-per-page");
            rowsPerPageInput.max = data.length; // Set max value to total number of entries
            
            rowsPerPageInput.addEventListener("change", () => {
                let maxRows = data.length; // Get the total number of entries
                let inputVal = parseInt(rowsPerPageInput.value) || 25;
            
                // Ensure the value stays between 1 and the total number of entries
                if (inputVal < 1) inputVal = 1;
                if (inputVal > maxRows) inputVal = maxRows;
            
                rowsPerPageInput.value = inputVal; // Snap value to valid range
                rowsPerPage = inputVal;
                currentPage = 1; // Reset to first page when changing row count
                updateTableAndPagination(data);
            });
            let lastSelectedProblem = null;

            // Set default message in details section
            // detailsDiv.innerHTML = "Click on a problem to see details.";
            // detailsDiv.innerHTML = "Click on a problem to see details.";

            // Populate category filter dropdown
            const categories = [...new Set(data.map(entry => entry.category))];
            categories.forEach(cat => {
                let option = document.createElement("option");
                option.value = cat;
                option.textContent = cat;
                categoryFilter.appendChild(option);
            });

            function updateTableAndPagination(filteredData) {
                rowsPerPage = parseInt(rowsPerPageInput.value) || 10; // Get user input, fallback to 10
                const totalPages = Math.ceil(filteredData.length / rowsPerPage);
                renderTable(filteredData);
                renderPaginationControls(filteredData, totalPages);
            }

            function renderTable(filteredData) {
                const totalPages = Math.ceil(filteredData.length / rowsPerPage);

                // Ensure current page is within range
                if (currentPage > totalPages) currentPage = totalPages;
                if (currentPage < 1) currentPage = 1;

                // Slice data to show only relevant rows for the current page
                const start = (currentPage - 1) * rowsPerPage;
                const end = start + rowsPerPage;
                const paginatedData = filteredData.slice(start, end);

                tableBody.innerHTML = "";
                paginatedData.forEach(entry => {
                    let row = document.createElement("tr");
                    row.innerHTML = `
                        <td><a href="#" class="problem-link" data-details="${entry.details}" data-image="${entry.image}">${entry.problem}</a></td>
                        <td>${entry.nonzeros}</td>
                        <td>${entry.avg_degree.toFixed(2)}</td>
                        <td>${entry.rows}</td>
                        <td>${entry.category}</td>
                    `;
                    tableBody.appendChild(row);
                });

                attachClickEventToProblems();
            }
            // function attachClickEventToProblems() {
            //     document.querySelectorAll(".problem-link").forEach(link => {
            //       link.addEventListener("click", event => {
            //         event.preventDefault();
            //         const imageUrl = link.dataset.image || 'https://via.placeholder.com/400';
              
            //         if (lastSelectedProblem === imageUrl) {
            //           detailsDiv.textContent = "Click on a problem to see details.";
            //           lastSelectedProblem = null;
            //         } else {
            //           detailsDiv.innerHTML = `
            //             <img
            //               src="${imageUrl}"
            //               alt="Problem Details"
            //               style="max-width:80%; display:block;"
            //             >
            //           `;
            //           lastSelectedProblem = imageUrl;
            //         }
            //       });
            //     });
            //   }
            // function attachClickEventToProblems() {
            //     document.querySelectorAll(".problem-link").forEach(link => {
            //       link.addEventListener("click", e => {
            //         e.preventDefault();
              
            //         const imgURL = link.dataset.image || "https://via.placeholder.com/400";
            //         const tr      = link.closest("tr");
            //         const nextTr  = tr.nextElementSibling;
              
            //         // If a drawer is already open just below
            //         if (nextTr && nextTr.classList.contains("details-row")) {
            //           const wrapper = nextTr.querySelector(".details-wrapper");
            //           // Toggle the same drawer
            //           if (wrapper.style.maxHeight && wrapper.style.maxHeight !== "0px") {
            //             wrapper.style.maxHeight = "0";           // collapse
            //           } else {
            //             wrapper.style.maxHeight = wrapper.scrollHeight + "px"; // expand
            //           }
            //           // Update image if a different link in the same row is clicked
            //           nextTr.querySelector("img").src = imgURL;
            //           return;
            //         }
              
            //         // Otherwise close any other open drawer first
            //         document.querySelectorAll(".details-row").forEach(row => row.remove());
              
            //         // Build the drawer row
            //         const detailsRow = document.createElement("tr");
            //         detailsRow.className = "details-row";
            //         detailsRow.innerHTML = `
            //           <td colspan="5">
            //             <div class="details-wrapper">
            //               <img src="${imgURL}" alt="Problem details">
            //             </div>
            //           </td>
            //         `;
            //         tr.after(detailsRow);
              
            //         // Trigger animation after insertion
            //         const wrapper = detailsRow.querySelector(".details-wrapper");
            //         wrapper.style.maxHeight = wrapper.scrollHeight + "px";
            //       });
            //     });
            //   }

            // function attachClickEventToProblems() {
            //     // remove any old handlers first (in case the table is re‑rendered)
            //     document.querySelectorAll(".problem-link").forEach(link => {
            //       link.replaceWith(link.cloneNode(true));
            //     });
              
            //     document.querySelectorAll(".problem-link").forEach(link => {
            //       link.addEventListener("click", e => {
            //         e.preventDefault();
              
            //         const imgURL = link.dataset.image || "https://via.placeholder.com/400";
            //         const tr     = link.closest("tr");
            //         const next   = tr.nextElementSibling;
              
            //         /* ---------- 1.  If drawer already below, just toggle it ---------- */
            //         if (next && next.classList.contains("details-row")) {
            //           const wrap = next.querySelector(".details-wrapper");
              
            //           if (wrap.style.maxHeight === "0px" || !wrap.style.maxHeight) {
            //             // re‑expand
            //             wrap.style.maxHeight = wrap.scrollHeight + "px";
            //           } else {
            //             // collapse then remove the row when animation ends
            //             // wrap.addEventListener("transitionend", () => next.remove(), { once:true });
            //             // wrap.style.maxHeight = "0px";
            //             // collapse drawer
            //             wrap.addEventListener("transitionend", function handler(e) {
            //                 if (e.propertyName === "max-height") {
            //                 next.remove();
            //                 }
            //             }, { once: true });
            //             wrap.style.maxHeight = "0px";
            //           }
            //           // update the image (in case a different link in same row is clicked)
            //           next.querySelector("img").src = imgURL;
            //           return;
            //         }
              
            //         /* ---------- 2.  Close any existing drawer elsewhere ---------- */
            //         document.querySelectorAll(".details-row").forEach(row => {
            //           const wrap = row.querySelector(".details-wrapper");
            //         //   wrap.addEventListener("transitionend", () => row.remove(), { once:true });
            //         //   wrap.style.maxHeight = "0px";
            //         // collapse drawer
            //         wrap.addEventListener("transitionend", function handler(e) {
            //             if (e.propertyName === "max-height") {
            //             next.remove();
            //             }
            //         }, { once: true });
            //         wrap.style.maxHeight = "0px";
            //         });
              
            //         /* ---------- 3.  Build a fresh drawer row ---------- */
            //         const detailsRow = document.createElement("tr");
            //         detailsRow.className = "details-row";
            //         detailsRow.innerHTML = `
            //             <td colspan="5">
            //             <div class="details-wrapper">
            //                 <img
            //                 src="${imgURL}"
            //                 alt="Problem details"
            //                 style="width:80%; max-width:600px; display:block; margin:10px auto;"
            //                 >
            //             </div>
            //             </td>
            //         `;
            //         tr.after(detailsRow);
              
            //         const wrap = detailsRow.querySelector(".details-wrapper");
            //         const img  = wrap.querySelector("img");
              
            //         // When the image finishes loading, recalc maxHeight so the drawer
            //         // can grow to its full size. First expansion is from 0px -> few px,
            //         // second (after load) is to the real height.
            //         img.addEventListener("load", () => {
            //           wrap.style.maxHeight = wrap.scrollHeight + "px";
            //         });
              
            //         // Kick off the first part of the animation immediately
            //         requestAnimationFrame(() => {
            //           wrap.style.maxHeight = wrap.scrollHeight + "px";
            //         });
            //       });
            //     });
            //   }

            // in your JS, replace your toggle code with:

            function attachClickEventToProblems() {
                document.querySelectorAll(".problem-link").forEach(link => {
                link.addEventListener("click", e => {
                    e.preventDefault();
                    const imgURL = link.dataset.image;
                    const tr     = link.closest("tr");
                    const next   = tr.nextElementSibling;
            
                    // --- collapse if already open ---
                    if (next && next.classList.contains("details-row")) {
                    const wrap = next.querySelector(".details-wrapper");
                    // 1) capture current height
                    const fromH = wrap.getBoundingClientRect().height;
                    wrap.style.maxHeight = fromH + "px";
                    // 2) force reflow so browser registers that height
                    wrap.offsetHeight;
                    // 3) now collapse
                    wrap.style.maxHeight = "0";
            
                    // only remove AFTER the max‑height transition finishes
                    wrap.addEventListener("transitionend", function handler(ev) {
                        if (ev.propertyName === "max-height") next.remove();
                    }, { once: true });
            
                    return;
                    }
            
                    // --- otherwise, close any other open drawer first ---
                    document.querySelectorAll(".details-row").forEach(r => {
                    const w = r.querySelector(".details-wrapper");
                    const h = w.getBoundingClientRect().height;
                    w.style.maxHeight = h + "px";
                    w.offsetHeight;
                    w.style.maxHeight = "0";
                    w.addEventListener("transitionend", () => r.remove(), { once: true });
                    });
            
                    // --- then build & open this one ---
                    const detailsRow = document.createElement("tr");
                    detailsRow.className = "details-row";
                    detailsRow.innerHTML = `
                        <td colspan="5">
                        <div class="details-wrapper">
                            <img
                            src="${imgURL}"
                            alt="Problem details"
                            style="width:80%; max-width:1000px; display:block; margin:10px auto;"
                            >
                        </div>
                        </td>
                    `;
                    tr.after(detailsRow);
            
                    const wrap = detailsRow.querySelector(".details-wrapper");
                    const img  = wrap.querySelector("img");
            
                    // once image loads, animate to its full height
                    img.addEventListener("load", () => {
                    wrap.style.maxHeight = wrap.scrollHeight + "px";
                    });
            
                    // kick off initial opening
                    wrap.style.maxHeight = "0";     // ensure start at zero
                    wrap.offsetHeight;              // flush
                    wrap.style.maxHeight = wrap.scrollHeight + "px";
                });
                });
            }

            function renderPaginationControls(filteredData, totalPages) {
                paginationContainer.innerHTML = "";
                if (totalPages <= 1) return; // Hide pagination if only one page
            
                const prevButton = document.createElement("button");
                prevButton.textContent = "Previous";
                prevButton.style.padding = "10px";
                prevButton.disabled = currentPage === 1;
                prevButton.addEventListener("click", () => {
                    currentPage--;
                    updateTableAndPagination(filteredData);
                });
            
                paginationContainer.appendChild(prevButton);
            
                for (let i = 1; i <= totalPages; i++) {
                    const pageButton = document.createElement("button");
                    pageButton.textContent = i;
                    pageButton.classList.add("page-btn");
                    pageButton.style.padding = "10px";
                    if (i === currentPage) {
                        pageButton.style.fontWeight = "bold";
                    }
                    pageButton.addEventListener("click", () => {
                        currentPage = i;
                        updateTableAndPagination(filteredData);
                    });
                    paginationContainer.appendChild(pageButton);
                }
            
                const nextButton = document.createElement("button");
                nextButton.textContent = "Next";
                nextButton.style.padding = "10px";
                nextButton.disabled = currentPage === totalPages;
                nextButton.addEventListener("click", () => {
                    currentPage++;
                    updateTableAndPagination(filteredData);
                });
            
                paginationContainer.appendChild(nextButton);
            }

            // Initial table render
            updateTableAndPagination(data);

            // Filtering functionality
            categoryFilter.addEventListener("change", () => {
                const selectedCategory = categoryFilter.value;
                const filteredData = selectedCategory
                    ? data.filter(entry => entry.category === selectedCategory)
                    : data;

                currentPage = 1; // Reset to first page when filtering
                updateTableAndPagination(filteredData);
            });
            

            // Sorting functionality with arrows
            document.querySelectorAll(".sortable").forEach(header => {
                const sortArrow = header.querySelector(".sort-arrow");
                if (!sortArrow) {
                    const arrowSpan = document.createElement("span");
                    arrowSpan.classList.add("sort-arrow");
                    header.appendChild(arrowSpan);
                }

                if (header.dataset.sort === currentSortColumn) {
                    header.querySelector(".sort-arrow").textContent = currentSortOrder === "asc" ? " ↑" : " ↓";
                } else {
                    header.querySelector(".sort-arrow").textContent = " →";
                }

                header.addEventListener("click", function () {
                    const key = this.dataset.sort;
                    const sortArrow = this.querySelector(".sort-arrow");

                    if (currentSortColumn === key) {
                        currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
                    } else {
                        currentSortColumn = key;
                        currentSortOrder = "asc";
                    }

                    // Remove arrows from all headers
                    document.querySelectorAll(".sort-arrow").forEach(arrow => {
                        // arrow.textContent = "";
                        arrow.textContent = " →"
                    });

                    // Set arrow for current sorted column
                    sortArrow.textContent = currentSortOrder === "asc" ? " ↑" : " ↓";

                    data.sort((a, b) => {
                        let aValue = a[key];
                        let bValue = b[key];

                        if (typeof aValue === "number" && typeof bValue === "number") {
                            return currentSortOrder === "asc" ? aValue - bValue : bValue - aValue;
                        } else {
                            return currentSortOrder === "asc"
                                ? String(aValue).localeCompare(String(bValue))
                                : String(bValue).localeCompare(String(aValue));
                        }
                    });

                    

                    currentPage = 1; // Reset to first page when sorting
                    updateTableAndPagination(data);

                });
            });

        });
});