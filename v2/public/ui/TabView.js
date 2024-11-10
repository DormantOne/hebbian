export default class TabView {
  constructor(tabViewID, defaultTab = 0) {
    // Store the main container element
    // Container for entire tabview
    this.container = document.getElementById(tabViewID);

    if (!this.container) {
      console.error(`Element with ID ${tabViewID} not found.`);
      return;
    }

    // Container for portion after the tab select widget
    this.contentContainer = this.container.querySelector('.tab-content-container');

    if (!this.contentContainer) {
      console.error("TabView outer container was located but it was not configured with a valid content container.");
    }

    this.containerVisibleDisplay =
      this.container.getAttribute("data-init-display") || "block";

    this.tabClass = "tab"; // Class for tab buttons
    this.contentClass = "tab-content"; // Class for tab content sections
    this.activeClass = "tab-active"; // Class to highlight the active tab

    // Get all tab buttons and content sections
    this.tabs = Array.from(
      this.container.getElementsByClassName(this.tabClass)
    );
    this.contents = Array.from(
      this.container.getElementsByClassName(this.contentClass)
    );

    this.defaultTab = defaultTab;

  }

  constrainToFractionOfWindowHeight(getUsedHeight) {

    const fraction = (window.innerHeight-getUsedHeight())/window.innerHeight

    const applyConstraint = () => {
      this.contentContainer.style.height = `${fraction * window.innerHeight}px`
      this.contentContainer.style.maxHeight = `${fraction * window.innerHeight}px`

    }

    applyConstraint()

    window.addEventListener("resize", applyConstraint)

    return this
  }

  start() {
    // Initialize event listeners and show the default tab
    this.initTabs();

    // Select default tab by index or title (string)
    if (typeof this.defaultTab === "string") {
      this.showTabByTitle(defaultTab);
    } else {
      this.showTab(this.defaultTab); // Show the first tab by default (index 0)
    }

    // Display the container now that setup is complete
    this.container.style.display = this.containerVisibleDisplay;
  }

  initTabs() {
    // Attach click event listeners to each tab
    this.tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => this.showTab(index));
    });
  }

  showTab(index) {
    if (index < 0 || index >= this.contents.length) {
      console.error("Invalid tab index.");
      return;
    }

    // Hide all content sections
    this.contents.forEach((content) => {
      content.style.display = "none";
    });

    // Remove the active class from all tabs
    this.tabs.forEach((tab) => {
      tab.classList.remove(this.activeClass);
    });

    // Show the selected content section and activate the corresponding tab
    this.tabs[index].classList.add(this.activeClass);
    this.contents[index].style.display =
      this.contents[index].getAttribute("data-init-display") || "block";
  }

  showTabByTitle(title) {
    // Find the tab by title and show it if found
    const index = this.tabs.findIndex(
      (tab) => tab.textContent.trim() === title
    );
    if (index !== -1) {
      this.showTab(index);
    } else {
      console.warn(`Tab with title "${title}" not found. Showing default tab.`);
      this.showTab(0);
    }
  }
}
