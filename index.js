class OperationTable {
    constructor(size) {
        this.size = size;

        this.tableElement = this.createTableElement(size);

        window.addEventListener('keydown', (event) => {
            if (event.key == "Escape") {
                this.clearSelection();
            } else if (event.key == "Backspace" || event.key == "Delete") {
                this.setValueAtSelection('');
            } else if (event.key == "ArrowDown") {
                this.moveSelection({dx: 0, dy: 1});
            } else if (event.key == "ArrowLeft") {
                this.moveSelection({dx: -1, dy: 0});
            } else if (event.key == "ArrowRight") {
                this.moveSelection({dx: 1, dy: 0});
            } else if (event.key == "ArrowUp") {
                this.moveSelection({dx: 0, dy: -1});
            } else if (event.key == '0' || event.key == '1') {
                this.setValueAtSelection(event.key);
            } else if (event.key.length === 1) {
                const charCode = event.key.charCodeAt(0);
                const index = 2 + charCode - 'a'.charCodeAt(0);
                if (index >= 0 && index < size) {
                    this.setValueAtSelection(event.key);
                }
            }
        });
    }

    createTableElement(size) {
        throw new Error('Subclasses must implement this method.');
    }

    isValidSelection({x, y}) {
        throw new Error('Subclasses must implement this method.');
    }

    getElement() {
        return this.tableElement;
    }

    getElementAtCoordinate({x, y}) {
        return this.tableElement.children[y + 1].children[x + 1];
    }

    setSelectedCoordinate({x, y}) {
        this.clearSelection();
        this.selectedCoordinate = {x, y};
        const selectedElement = this.getElementAtCoordinate(this.selectedCoordinate);
        selectedElement.classList.add("selected-cell");
    }

    clearSelection() {
        if (this.selectedCoordinate !== undefined) {
            const lastSelectedElement = this.getElementAtCoordinate(this.selectedCoordinate);
            lastSelectedElement.classList.remove('selected-cell');
        }
        this.selectedCoordinate = undefined;
    }
    moveSelection({dx, dy}) {
        if (this.selectedCoordinate === undefined) {
            return;
        }
        const newCoordinate = {x: this.selectedCoordinate.x + dx, y: this.selectedCoordinate.y + dy};
        if (this.isValidSelection(newCoordinate)) {
            this.setSelectedCoordinate(newCoordinate);
        }
    }

    setValueAtSelection(value) {
        if (this.selectedCoordinate === undefined) {
            return;
        }
        const selectedElement = this.getElementAtCoordinate(this.selectedCoordinate);
        selectedElement.innerText = value;
        const mirroredSelectedElement = this.getElementAtCoordinate({x: this.selectedCoordinate.y, y: this.selectedCoordinate.x});
        mirroredSelectedElement.innerText = value;
        this.setErrors();
    }

    setErrors() {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                this.getElementAtCoordinate({x, y}).classList.remove('error');
            }
        }

        // Check for duplicates in rows.
        for (let y = 1; y < this.size; y++) {
            const symbols = new Set();
            const duplicates = new Set();
            for (let x = 0; x < this.size; x++) {
                const symbol = this.getElementAtCoordinate({x, y}).innerText;
                if (symbols.has(symbol)) {
                    duplicates.add(symbol);
                } else if (symbol !== '') {
                    symbols.add(symbol);
                }
            }
            for (let x = 0; x < this.size; x++) {
                const element = this.getElementAtCoordinate({x, y});
                const symbol = element.innerText;
                if (duplicates.has(symbol)) {
                    element.classList.add('error');
                }
            }
        }

        // Check for duplicates in columns.
        for (let x = 1; x < this.size; x++) {
            const symbols = new Set();
            const duplicates = new Set();
            for (let y = 0; y < this.size; y++) {
                const symbol = this.getElementAtCoordinate({x, y}).innerText;
                if (symbols.has(symbol)) {
                    duplicates.add(symbol);
                } else if (symbol !== '') {
                    symbols.add(symbol);
                }
            }
            for (let y = 0; y < this.size; y++) {
                const element = this.getElementAtCoordinate({x, y});
                const symbol = element.innerText;
                if (duplicates.has(symbol)) {
                    element.classList.add('error');
                }
            }
        }
    }
}

class AdditionTable extends OperationTable {
    constructor(size) {
        super(size);
    }

    createTableElement(size) {
        const tableElement = document.createElement('table');

        const topRow = document.createElement('tr');

        const operationLabelCell = document.createElement('td');
        operationLabelCell.innerText = '+';
        operationLabelCell.classList.add('operation-label-cell');

        topRow.appendChild(operationLabelCell);

        for (let x = 0; x < size; x++) {
            const labelCell = document.createElement('td');
            labelCell.innerText = getLabel(x);
            labelCell.classList.add('label-cell');
            topRow.appendChild(labelCell);
        }

        tableElement.appendChild(topRow);

        for (let y = 0; y < size; y++) {
            const row = document.createElement('tr');
            const labelCell = document.createElement('td');
            labelCell.innerText = getLabel(y);
            labelCell.classList.add('label-cell');
            row.appendChild(labelCell);
            for (let x = 0; x < size; x++) {
                const cell = document.createElement('td');
                if (y == 0) {
                    cell.innerText = getLabel(x);
                    cell.classList.add('pre-filled');
                } else if (x === 0) {
                    cell.innerText = getLabel(y);
                    cell.classList.add('pre-filled');
                }
                if (this.isValidSelection({x, y})) {
                    cell.addEventListener('click', () => this.setSelectedCoordinate({x, y}));
                } else {
                    cell.classList.add('pre-filled');
                }
                row.appendChild(cell);
            }
            tableElement.appendChild(row);
        }

        return tableElement;
    }

    isValidSelection({x, y}) {
        // Pre-filled cells are not valid selections.
        const isInBounds = x >= 1 && x < this.size && y >= 1 && y < this.size;
        const isDiagonalOrAbove = y <= x;
        return isInBounds && isDiagonalOrAbove;
    }
}

class MultiplicationTable extends OperationTable {
    constructor(size) {
        super(size);
    }

    createTableElement(size) {
        const tableElement = document.createElement('table');

        const topRow = document.createElement('tr');

        const operationLabelCell = document.createElement('td');
        operationLabelCell.innerText = '\u00d7';
        operationLabelCell.classList.add('operation-label-cell');

        topRow.appendChild(operationLabelCell);

        for (let x = 0; x < size; x++) {
            const labelCell = document.createElement('td');
            labelCell.innerText = getLabel(x);
            labelCell.classList.add('label-cell');
            topRow.appendChild(labelCell);
        }

        tableElement.appendChild(topRow);

        for (let y = 0; y < size; y++) {
            const row = document.createElement('tr');
            const labelCell = document.createElement('td');
            labelCell.innerText = getLabel(y);
            labelCell.classList.add('label-cell');
            row.appendChild(labelCell);
            for (let x = 0; x < size; x++) {
                const cell = document.createElement('td');
                if (y == 0) {
                    cell.innerText = '0';
                    cell.classList.add('pre-filled');
                } else if (y == 1) {
                    cell.innerText = getLabel(x);
                    cell.classList.add('pre-filled');
                } else if (x === 0) {
                    cell.innerText = '0';
                    cell.classList.add('pre-filled');
                } else if (x == 1) {
                    cell.innerText = getLabel(y);
                    cell.classList.add('pre-filled');
                }
                if (this.isValidSelection({x, y})) {
                    cell.addEventListener('click', () => this.setSelectedCoordinate({x, y}));
                } else {
                    cell.classList.add('pre-filled');
                }
                row.appendChild(cell);
            }
            tableElement.appendChild(row);
        }

        return tableElement;
    }

    isValidSelection({x, y}) {
        // Pre-filled cells are not valid selections.
        const isInBounds = x >= 2 && x < this.size && y >= 2 && y < this.size;
        const isDiagonalOrAbove = y <= x;
        return isInBounds && isDiagonalOrAbove;
    }
}

const setupGame = (size) => {
    const playAreaElement = document.getElementsByClassName("play-area")[0];

    while (playAreaElement.firstChild) {
        playAreaElement.removeChild(playAreaElement.firstChild);
    }

    const additionTable = new AdditionTable(size);
    const additionTableElement = additionTable.getElement();
    playAreaElement.appendChild(additionTableElement);

    const multiplicationTable = new MultiplicationTable(size);
    const multiplicationTableElement = multiplicationTable.getElement();
    playAreaElement.appendChild(multiplicationTableElement);

    additionTableElement.addEventListener('click', () => multiplicationTable.clearSelection());
    multiplicationTableElement.addEventListener('click', () => additionTable.clearSelection());
}

const getLabel = (index) => {
    if (index <= 1) {
        return index.toString();
    }
    return String.fromCharCode('a'.charCodeAt(0) + index - 2);
}

setupGame(5);