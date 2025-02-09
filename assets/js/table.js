document.addEventListener("DOMContentLoaded", function () {
    fetch("/assets/data/performance.json")
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector("#performance-table tbody");
            const categoryFilter = document.getElementById("category-filter");
            const paginationContainer = document.getElementById("pagination");
            const detailsDiv = document.getElementById("details");

            let currentSortColumn = "problem";
            let currentSortOrder = "asc";
            let currentPage = 1;
            // const rowsPerPage = 10; // Adjust this value to control how many rows appear per page
            let rowsPerPage = 10; // Default value
            const rowsPerPageInput = document.getElementById("rows-per-page");
            rowsPerPageInput.max = data.length; // Set max value to total number of entries
            
            rowsPerPageInput.addEventListener("change", () => {
                let maxRows = data.length; // Get the total number of entries
                let inputVal = parseInt(rowsPerPageInput.value) || 10;
            
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
            detailsDiv.innerHTML = "Click on a problem to see details.";

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
                        <td><a href="#" class="problem-link" data-details="${entry.details}" data-image="${entry.image || 'https://via.placeholder.com/400'}">${entry.problem}</a></td>
                        <td>${entry.metric1}</td>
                        <td>${entry.metric2}</td>
                        <td>${entry.category}</td>
                    `;
                    tableBody.appendChild(row);
                });

                attachClickEventToProblems();
            }

            function attachClickEventToProblems() {
                document.querySelectorAll(".problem-link").forEach(link => {
                    link.addEventListener("click", function (event) {
                        event.preventDefault();
                        const imageUrl = this.dataset.image || "https://via.placeholder.com/400"; // Placeholder image
                        
                        // If clicking the same problem again, hide the image and show default message
                        if (lastSelectedProblem === imageUrl) {
                            detailsDiv.innerHTML = "Click on a problem to see details.";
                            lastSelectedProblem = null;
                        } else {
                            detailsDiv.innerHTML = `<img id="details-image" src="${imageUrl}" alt="Problem Details" style="max-width: 100%;">`;
                            lastSelectedProblem = imageUrl;
                        }
                    });
                });
            }

            // function renderPaginationControls(filteredData, totalPages) {
            //     paginationContainer.innerHTML = "";
            //     if (totalPages <= 1) return; // Hide pagination if only one page

            //     const prevButton = document.createElement("button");
            //     prevButton.textContent = "Previous";
            //     prevButton.disabled = currentPage === 1;
            //     prevButton.addEventListener("click", () => {
            //         currentPage--;
            //         updateTableAndPagination(filteredData);
            //     });

            //     paginationContainer.appendChild(prevButton);

            //     for (let i = 1; i <= totalPages; i++) {
            //         const pageButton = document.createElement("button");
            //         pageButton.textContent = i;
            //         pageButton.classList.add("page-btn");
            //         if (i === currentPage) {
            //             pageButton.style.fontWeight = "bold";
            //         }
            //         pageButton.addEventListener("click", () => {
            //             currentPage = i;
            //             updateTableAndPagination(filteredData);
            //         });
            //         paginationContainer.appendChild(pageButton);
            //     }

            //     const nextButton = document.createElement("button");
            //     nextButton.textContent = "Next";
            //     nextButton.disabled = currentPage === totalPages;
            //     nextButton.addEventListener("click", () => {
            //         currentPage++;
            //         updateTableAndPagination(filteredData);
            //     });

            //     paginationContainer.appendChild(nextButton);
            // }

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
                        arrow.textContent = "";
                    });

                    // Set arrow for current sorted column
                    sortArrow.textContent = currentSortOrder === "asc" ? " ▲" : " ▼";

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
                    data.sort((a, b) => a.problem.localeCompare(b.problem)); // Default sorting by Problem

                });
            });
        });
});