class OperationTable {
    constructor(size) {
        this.size = size;

        this.tableElement = this.createTableElement(size);

        window.addEventListener('keydown', (event) => {
            if (event.key == "Escape") {
                this.clearSelection();
            } else if (event.key == "Backspace") {
                this.setValueAtSelection(undefined);
                this.moveSelection({dx: -1, dy: 0});
            } else if(event.key == "Delete") {
                this.setValueAtSelection(undefined);
            } else if (event.key == "ArrowDown") {
                this.moveSelection({dx: 0, dy: 1});
            } else if (event.key == "ArrowLeft") {
                this.moveSelection({dx: -1, dy: 0});
            } else if (event.key == "ArrowRight") {
                this.moveSelection({dx: 1, dy: 0});
            } else if (event.key == "ArrowUp") {
                this.moveSelection({dx: 0, dy: -1});
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

    getIndexAtCoordinate({x, y}) {
        const indexString = this.tableElement.children[y + 1]?.children[x + 1]?.dataset.index;
        return indexString === undefined ? undefined : Number(indexString);
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

    setValueAtSelection(index) {
        if (this.selectedCoordinate === undefined) {
            return;
        }
        const selectedElement = this.getElementAtCoordinate(this.selectedCoordinate);
        selectedElement.dataset.index = index;
        const label = index === undefined ? '' : getLabel(index);
        selectedElement.innerText = label;
        const mirroredSelectedElement = this.getElementAtCoordinate({x: this.selectedCoordinate.y, y: this.selectedCoordinate.x});
        mirroredSelectedElement.innerText = label;
        this.setErrors();

        this.listenFunction && this.listenFunction();
    }

    relabel() {
        for (let y = -1; y < this.size; y++) {
            for (let x = -1; x < this.size; x++) {
                const index = this.getIndexAtCoordinate({x, y});
                if (index === undefined) {
                    continue;
                }
                const label = getLabel(index);
                this.getElementAtCoordinate({x, y}).innerText = label;
            }
        }
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

    getAssociativeLawErrors() {
        const errors = [];
        // Check that (i % j) % k == i % (j % k).
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                for (let k = j; k < this.size; k++) {
                    const iAndJ = this.getIndexAtCoordinate({x: i, y: j});
                    if (iAndJ === undefined) {
                        continue;
                    }
                    const iAndJThenK = this.getIndexAtCoordinate({x: iAndJ, y: k});
                    if (iAndJThenK === undefined) {
                        continue;
                    }
                    const jAndK = this.getIndexAtCoordinate({x: j, y: k});
                    if (jAndK === undefined) {
                        continue;
                    }
                    const iThenJAndK = this.getIndexAtCoordinate({x: i, y: jAndK});
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
            labelCell.dataset.index = x;
            labelCell.classList.add('label-cell');
            topRow.appendChild(labelCell);
        }

        tableElement.appendChild(topRow);

        for (let y = 0; y < size; y++) {
            const row = document.createElement('tr');
            const labelCell = document.createElement('td');
            labelCell.innerText = getLabel(y);
            labelCell.dataset.index = y;
            labelCell.classList.add('label-cell');
            row.appendChild(labelCell);
            for (let x = 0; x < size; x++) {
                const cell = document.createElement('td');
                if (y == 0) {
                    cell.innerText = getLabel(x);
                    cell.dataset.index = x;
                    cell.classList.add('pre-filled');
                } else if (x === 0) {
                    cell.innerText = getLabel(y);
                    cell.dataset.index = y;
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
            labelCell.dataset.index = x;
            labelCell.classList.add('label-cell');
            topRow.appendChild(labelCell);
        }

        tableElement.appendChild(topRow);

        for (let y = 0; y < size; y++) {
            const row = document.createElement('tr');
            const labelCell = document.createElement('td');
            labelCell.innerText = getLabel(y);
            labelCell.dataset.index = y;
            labelCell.classList.add('label-cell');
            row.appendChild(labelCell);
            for (let x = 0; x < size; x++) {
                const cell = document.createElement('td');
                if (y == 0) {
                    cell.innerText = '0';
                    cell.dataset.index = '0';
                    cell.classList.add('pre-filled');
                } else if (y == 1) {
                    cell.innerText = getLabel(x);
                    cell.classList.add('pre-filled');
                } else if (x === 0) {
                    cell.innerText = '0';
                    cell.dataset.index = '0'
                    cell.classList.add('pre-filled');
                } else if (x == 1) {
                    cell.innerText = getLabel(y);
                    cell.dataset.index = y;
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

const removeAllChildren = (element) => {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

const indexToLabel = new Map();
indexToLabel.set(0, '0');
indexToLabel.set(1, '1');

const setupGame = (size) => {
    for (let i = 2; i < size; i++) {
        indexToLabel.set(i, String.fromCharCode('a'.charCodeAt(0) + i - 2));
    }

    const playAreaElement = document.getElementsByClassName("play-area")[0];
    removeAllChildren(playAreaElement);

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

    const buttonsAreaElement = document.getElementsByClassName('buttons-area')[0];
    removeAllChildren(buttonsAreaElement);

    const labelRowElement = document.createElement('tr');

    for (let i = 0; i < 2; i++) {
        const divisionElement = document.createElement('td');
        labelRowElement.append(divisionElement);
    }
    

    for (let i = 2; i < size; i++) {
        const inputElement = document.createElement('input');
        const label = getLabel(i);
        inputElement.value = label;
        inputElement.addEventListener('input', (event) => {
            if (event.target.value) {
                indexToLabel.set(i, event.target.value);
                additionTable.relabel();
                multiplicationTable.relabel();
            }
        });

        const divisionElement = document.createElement('td');
        divisionElement.append(inputElement);

        labelRowElement.append(divisionElement);
    }

    const buttonRowElement = document.createElement('tr');

    for (let i = 0; i < size; i++) {
        const buttonElement = document.createElement('button');
        const label = getLabel(i);
        buttonElement.innerText = label;
        buttonElement.addEventListener("click", () => {
            additionTable.setValueAtSelection(i);
            multiplicationTable.setValueAtSelection(i);
        })

        const divisionElement = document.createElement('td');
        divisionElement.append(buttonElement);

        buttonRowElement.append(divisionElement);
    }

    const tableElement = document.createElement('table');
    tableElement.append(labelRowElement);
    tableElement.append(buttonRowElement);

    buttonsAreaElement.append(tableElement);
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
                const jPlusKIndex = additionTable.getIndexAtCoordinate({x: j, y: k});
                if (jPlusKIndex === undefined) {
                    continue;
                }
                const iTimesJPlusKIndex = multiplicationTable.getIndexAtCoordinate({x: i, y: jPlusKIndex});
                if (iTimesJPlusKIndex === undefined) {
                    continue;
                }

                const iTimesJIndex = multiplicationTable.getIndexAtCoordinate({x: i, y: j});
                if (iTimesJIndex === undefined) {
                    continue;
                }
                const iTimesKIndex = multiplicationTable.getIndexAtCoordinate({x: i, y: k});
                if (iTimesKIndex === undefined) {
                    continue;
                }
                const iTimesJPlusITimesKIndex = additionTable.getIndexAtCoordinate({x: iTimesJIndex, y: iTimesKIndex});
                if (iTimesJPlusITimesKIndex === undefined) {
                    continue;
                }

                if (iTimesJPlusKIndex !== iTimesJPlusITimesKIndex) {
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
    return indexToLabel.get(index);
}

const resetButtonElement = document.getElementsByClassName('start-button')[0];
const sizeInputElement = document.getElementsByClassName('size-input')[0];
sizeInputElement.value = 5;

setupGame(Number.parseInt(sizeInputElement.value));


resetButtonElement.addEventListener('click', () => {
    const size = Number.parseInt(sizeInputElement.value);
    setupGame(size);
});