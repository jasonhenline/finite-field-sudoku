class OperationTable {
    constructor(size) {
        this.size = size;

        this.tableElement = this.createTableElement(size);

        window.addEventListener('keydown', (event) => {
            if (event.key == "Escape") {
                this.clearSelection();
            } else if (event.key == "Backspace") {
                this.setValueAtSelection('');
                this.moveSelection({dx: -1, dy: 0});
            } else if(event.key == "Delete") {
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

    registerChangeListener(listenFunction) {
        this.listenFunction = listenFunction;
    }

    createTableElement(size) {
        throw new Error('Subclasses must implement this method.');
    }

    isValidSelection({x, y}) {
        throw new Error('Subclasses must implement this method.');
    }

    getOpString() {
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

        this.listenFunction && this.listenFunction();
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

    getResultIndex({x, y}) {
        const label = this.getElementAtCoordinate({x, y}).innerText;
        if (label === '') {
            return undefined;
        }
        return getIndex(label);
    }

    getAssociativeLawErrors() {
        const errors = [];
        // Check that (i % j) % k == i % (j % k).
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                for (let k = j; k < this.size; k++) {
                    const iAndJ = this.getResultIndex({x: i, y: j});
                    if (iAndJ === undefined) {
                        continue;
                    }
                    const iAndJThenK = this.getResultIndex({x: iAndJ, y: k});
                    if (iAndJThenK === undefined) {
                        continue;
                    }
                    const jAndK = this.getResultIndex({x: j, y: k});
                    if (jAndK === undefined) {
                        continue;
                    }
                    const iThenJAndK = this.getResultIndex({x: i, y: jAndK});
                    if (iThenJAndK === undefined) {
                        continue;
                    }

                    if (iAndJThenK !== iThenJAndK) {
                        const [iLabel, jLabel, kLabel, iAndJThenKLabel, iThenJAndKLabel] = [i, j, k, iAndJThenK, iThenJAndK].map(getLabel);
                        const op = this.getOpString();
                        errors.push(`(${iLabel} ${op} ${jLabel}) ${op} ${kLabel} = ${iAndJThenKLabel} does not equal ${iLabel} ${op} (${jLabel} ${op} ${kLabel}) = ${iThenJAndKLabel}`);
                    }
                }
            }
        }
        return errors;
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
                    cell.classList.add('selectable');
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

    getOpString() {
        return "+";
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
                    cell.classList.add('selectable');
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

    getOpString() {
        return "*";
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

    const checkDistributiveLaw = getDistributiveLawChecker(additionTable, multiplicationTable);
    additionTable.registerChangeListener(checkDistributiveLaw);
    multiplicationTable.registerChangeListener(checkDistributiveLaw);
    checkDistributiveLaw();
}

const getDistributiveLawChecker = (additionTable, multiplicationTable) => () => {
    const associativeErrors = additionTable.getAssociativeLawErrors().concat(multiplicationTable.getAssociativeLawErrors());
    const associativeLawErrorsSectionElement = document.getElementsByClassName('associative-law-errors-section')[0];
    while (associativeLawErrorsSectionElement.firstChild) {
        associativeLawErrorsSectionElement.removeChild(associativeLawErrorsSectionElement.firstChild);
    }

    if (associativeErrors.length) {
        const heading = document.createElement('h2');
        heading.innerText = "Associative Law Errors";
        associativeLawErrorsSectionElement.appendChild(heading);

        const errorListElement = document.createElement('ul');
        errorListElement.classList.add('error-messages');

        for (let errorMessage of associativeErrors) {
            const errorListItem = document.createElement('li');
            errorListItem.innerText = errorMessage;
            errorListElement.appendChild(errorListItem);
        }

        associativeLawErrorsSectionElement.appendChild(errorListElement);
    } else {
        const heading = document.createElement('h2');
        heading.innerText = "No Associative Law Errors";
        associativeLawErrorsSectionElement.appendChild(heading);
    }


    const distributiveErrors = [];
    const size = additionTable.size;

    // Check that i * (j + k) == i * j + i * k.
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            for (let k = j; k < size; k++) {
                const jPlusKLabel = additionTable.getElementAtCoordinate({x: j, y: k}).innerText;
                if (jPlusKLabel === '') {
                    continue;
                }
                jPlusKIndex = getIndex(jPlusKLabel);
                const iTimesJPlusKLabel = multiplicationTable.getElementAtCoordinate({x: i, y: jPlusKIndex}).innerText;
                if (iTimesJPlusKLabel === '') {
                    continue;
                }

                const iTimesJLabel = multiplicationTable.getElementAtCoordinate({x: i, y: j}).innerText;
                if (iTimesJLabel === '') {
                    continue;
                }
                const iTimesJIndex = getIndex(iTimesJLabel);

                const iTimesKLabel = multiplicationTable.getElementAtCoordinate({x: i, y: k}).innerText;
                if (iTimesKLabel === '') {
                    continue;
                }
                const iTimesKIndex = getIndex(iTimesKLabel);

                const iTimesJPlusITimesKLabel = additionTable.getElementAtCoordinate({x: iTimesJIndex, y: iTimesKIndex}).innerText;
                if (iTimesJPlusITimesKLabel === '') {
                    continue;
                }

                if (iTimesJPlusKLabel !== iTimesJPlusITimesKLabel) {
                    const [iLabel, jLabel, kLabel] = [i, j, k].map(getLabel);
                    distributiveErrors.push(`${iLabel}*(${jLabel} + ${kLabel}) = ${iTimesJPlusKLabel} does not equal ${iLabel}*${jLabel} + ${iLabel}*${kLabel} = ${iTimesJPlusITimesKLabel}`);
                }
            }
        }
    }

    const distributiveLawErrorsSectionElement = document.getElementsByClassName('distributive-law-errors-section')[0];
    while (distributiveLawErrorsSectionElement.firstChild) {
        distributiveLawErrorsSectionElement.removeChild(distributiveLawErrorsSectionElement.firstChild);
    }

    if (distributiveErrors.length) {
        const heading = document.createElement('h2');
        heading.innerText = "Distributive Law Errors";
        distributiveLawErrorsSectionElement.appendChild(heading);

        const errorListElement = document.createElement('ul');
        errorListElement.classList.add('error-messages');

        for (let errorMessage of distributiveErrors) {
            const errorListItem = document.createElement('li');
            errorListItem.innerText = errorMessage;
            errorListElement.appendChild(errorListItem);
        }

        distributiveLawErrorsSectionElement.appendChild(errorListElement);
    } else {
        const heading = document.createElement('h2');
        heading.innerText = "No Distributive Law Errors";
        distributiveLawErrorsSectionElement.appendChild(heading);
    }
}

const getLabel = (index) => {
    if (index <= 1) {
        return index.toString();
    }
    return String.fromCharCode('a'.charCodeAt(0) + index - 2);
}

const getIndex = (label) => {
    const isDigit = label == '0' || label == '1';
    const baseChar = isDigit ? '0' : 'a';
    const offset = isDigit ? 0 : 2
    return label.charCodeAt(0) - baseChar.charCodeAt(0) + offset;
}

const resetButtonElement = document.getElementsByClassName('start-button')[0];
const sizeInputElement = document.getElementsByClassName('size-input')[0];
sizeInputElement.value = 5;

setupGame(Number.parseInt(sizeInputElement.value));


resetButtonElement.addEventListener('click', () => {
    const size = Number.parseInt(sizeInputElement.value);
    setupGame(size);
});