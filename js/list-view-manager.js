// List View Manager - Handles all List View functionality
class ListViewManager {
    constructor() {
        this.isListViewVisible = false;
        this.initializeListView();
    }

    initializeListView() {
        // Make sure the list view elements exist
        const listView = document.getElementById('listView');
        if (!listView) {
            console.error('List View HTML elements not found');
            return;
        }
        
        // Initialize with current saved tracks
        this.updateListDisplay();
    }

    showListView() {
        const gridView = document.getElementById('gridView');
        const heroView = document.getElementById('heroView');
        const listView = document.getElementById('listView');

        if (!listView) {
            console.error('List View element not found');
            return;
        }

        // Hide other views
        if (gridView) gridView.classList.add('hidden');
        if (heroView) {
            heroView.classList.remove('active');
            heroView.classList.add('hidden');
        }

        // Show list view
        listView.classList.remove('hidden');
        this.isListViewVisible = true;

        // Update the display with current tracks immediately
        this.updateListDisplay();

        console.log('List View shown and updated');
    }
