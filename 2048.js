class Game {
    constructor(initialMatrix, score = 0, highTile = 2, comboStreak = 0) {
        this.matrix = initialMatrix || this.createNewGame();
        this.score = score;
        this.highTile = highTile; // Acompanha a maior peça no tabuleiro.
        this.comboStreak = comboStreak; // Acompanha sequências de combinações.
        this.isAlive = true;
    }

    createNewGame() {
        let newMatrix = [];
        for (let i = 0; i < 4; i++) {
            newMatrix[i] = [0, 0, 0, 0];
        }
        this.addNumber(newMatrix);
        this.addNumber(newMatrix);
        return newMatrix;
    }

    addNumber(matrix) {
        let availableSlots = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (matrix[i][j] === 0) {
                    availableSlots.push({ x: i, y: j });
                }
            }
        }
        if (availableSlots.length > 0) {
            let slot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
            matrix[slot.x][slot.y] = Math.random() < 0.82 ? 2 : 4; // 75% chance for 2, 25% for 4
        }
    }


    printMatrix() {
        console.log(this.matrix.map(row => row.join('\t')).join('\n'));
    }

    move(direction) {
        let moveResult = {
            matrix: [],
            isAlive: this.isAlive,
            isValidMove: true
        };

        if (!this.isAlive) {
            moveResult.isValidMove = false;
            return moveResult;
        }

        let prevMatrix = JSON.stringify(this.matrix);

        let numRotations;
        switch (direction) {
            case 'left':
                numRotations = 0;
                break;
            case 'down':
                numRotations = 1;
                break;
            case 'right':
                numRotations = 2;
                break;
            case 'up':
                numRotations = 3;
                break;
            default:
                numRotations = 0;
        }

        // Rotação da matriz
        this.matrix = this.rotateMatrix(this.matrix, numRotations);
        // Deslize e combine
        this.matrix = this.slide(this.matrix);
        this.matrix = this.combine(this.matrix);
        this.matrix = this.slide(this.matrix);
        // Rotação de volta à orientação original
        this.matrix = this.rotateMatrix(this.matrix, (4 - numRotations) % 4);

        // Verificar se o movimento resultou em alguma mudança
        if (prevMatrix !== JSON.stringify(this.matrix)) {
            this.addNumber(this.matrix);

            // Verifica se a maior peça está no canto superior direito.
            if (this.matrix[0][0] === this.highTile ||
                this.matrix[3][0] === this.highTile ||
                this.matrix[0][3] === this.highTile ||
                this.matrix[3][3] === this.highTile) {
                this.score += this.highTile; // Bônus por manter a peça de maior valor no canto.
                let sequenceScore = this.checkSequences(); // Verifica sequências e adiciona pontos baseados nelas.
                this.score += sequenceScore;
            }


            // Bônus de "limpeza" por espaços em branco, proporcional ao log2 do highTile.
            let emptySpaces = this.countEmptySpaces(this.matrix);
            let blankSpaceScore = emptySpaces * 0.5 * Math.log2(this.highTile);
            this.score += blankSpaceScore;
        } else {
            moveResult.isValidMove = false;
            this.comboStreak = 0; // Reseta a sequência de combinações.
            this.score -= 1; // Penalidade por movimento ineficaz.
        }

        moveResult.matrix = this.matrix;
        this.isAlive = moveResult.isAlive = this.canMove();

        return moveResult;
    }

    countEmptySpaces(matrix) {
        let emptySpaces = 0;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (matrix[i][j] === 0) {
                    emptySpaces++;
                }
            }
        }
        return emptySpaces;
    }

    checkSequences() {
        let visited = new Set();
        let sequenceScore = 0;

        // Encontrar as posições dos maiores valores.
        let highestPositions = [];
        this.matrix.forEach((row, i) => {
            row.forEach((value, j) => {
                if (value === this.highTile) {
                    highestPositions.push({ x: i, y: j });
                }
            });
        });

        const checkAdjacent = (x, y, prevValue) => {
            // Verifica se a posição é válida, não foi visitada e é metade do valor anterior.
            if (x >= 0 && x < 4 && y >= 0 && y < 4 && !visited.has(`${x},${y}`)
                && ((this.matrix[x][y] === prevValue) || (this.matrix[x][y] === prevValue / 2) || (this.matrix[x][y] === prevValue / 4))) {
                visited.add(`${x},${y}`);
                return 1 + checkAdjacent(x + 1, y, this.matrix[x][y]) +
                    checkAdjacent(x - 1, y, this.matrix[x][y]) +
                    checkAdjacent(x, y + 1, this.matrix[x][y]) +
                    checkAdjacent(x, y - 1, this.matrix[x][y]);
            }
            return 0;
        };

        // Inicia a verificação a partir das posições dos maiores valores.
        highestPositions.forEach(pos => {
            let sequenceLength = checkAdjacent(pos.x, pos.y, this.matrix[pos.x][pos.y] * 2);
            if (sequenceLength > 1) {
                // A pontuação é baseada no comprimento da sequência e nos valores dentro dela.
                sequenceScore += sequenceLength * Math.log2(this.matrix[pos.x][pos.y]);
            }
        });

        return sequenceScore;
    }

    rotateMatrix(matrix, rotations) {
        let newMatrix = matrix;
        while (rotations > 0) {
            newMatrix = newMatrix[0].map((val, index) => newMatrix.map(row => row[index]).reverse());
            rotations--;
        }
        return newMatrix;
    }

    slide(matrix) {
        let newMatrix = matrix.map(row => {
            let filteredRow = row.filter(num => num);
            let missing = 4 - filteredRow.length;
            let zeros = Array(missing).fill(0);
            return filteredRow.concat(zeros);
        });
        return newMatrix;
    }

    combine(matrix) {
        let combosThisMove = 0; // Contador para bônus de eficiência.
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 3; j++) {
                if (matrix[i][j] !== 0 && matrix[i][j] === matrix[i][j + 1]) {
                    matrix[i][j] *= 2;
                    this.highTile = Math.max(this.highTile, matrix[i][j]); // Atualiza a maior peça.
                    this.score += matrix[i][j] * (1 + Math.log2(matrix[i][j]) * 0.5); // Pontuação exponencial.
                    matrix[i][j + 1] = 0;
                    combosThisMove++;
                    this.comboStreak++; // Incrementa a sequência de combinações.
                }
            }
        }

        // Bônus por eficiência (múltiplas combinações em um movimento).
        if (combosThisMove > 1) {
            this.score += combosThisMove * 10;
        }

        // Bônus por sequência de combinações.
        if (this.comboStreak > 1) {
            this.score += this.comboStreak;
        }

        return matrix;
    }

    canMove() {
        // Verifica se há alguma jogada possível
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.matrix[i][j] === 0) {
                    return true;
                }
                if (j < 3 && this.matrix[i][j] === this.matrix[i][j + 1]) {
                    return true;
                }
                if (i < 3 && this.matrix[i][j] === this.matrix[i + 1][j]) {
                    return true;
                }
            }
        }
        return false;
    }
}

class MonteCarloSearchTree {
    constructor(game, depth) {
        this.root = {
            game: game,
            bestScore: 0,
            visits: 0,
            children: [],
        };
        this.simulationDepth = depth;
    }

    selectNode(node) {
        while (node.children.length !== 0) {
            node = node.children.reduce((prev, curr) => {
                const prevUCT = this.calculateUCT(prev);
                const currUCT = this.calculateUCT(curr);
                return (prevUCT > currUCT) ? prev : curr;
            });
        }
        return node;
    }

    calculateUCT(node) {
        if (node.visits === 0) {
            return Infinity;
        }
        const wi = node.bestScore;
        const c = Math.sqrt(3);
        const Ni = node.parent.visits
        const ni = node.visits;
        const explorationFactor = c * Math.sqrt(Math.log(Ni) / ni);
        const uctValue = wi / ni + explorationFactor;
        /* console.log(`${wi}/${ni} + ${c.toFixed(2)} * sqrt(log(${Ni}) / ${ni})`);
        console.log("-") */
        return uctValue;
    }

    expandNode(node) {
        // Assegurar que o nó não seja expandido se o jogo já estiver terminado
        if (!node.game.isAlive) {
            return;
        }

        // As direções possíveis de movimento no jogo 2048
        const directions = ['up', 'down', 'left', 'right'];

        // Criar um novo nó filho para cada movimento possível
        directions.forEach(direction => {
            // Clonar o estado atual do jogo
            let newGame = new Game(JSON.parse(JSON.stringify(node.game.matrix)), node.game.score, node.game.highTile, node.game.comboStreak);

            // Tentar mover na direção atual
            let moveResult = newGame.move(direction);

            // Somente adicionar o nó filho se o movimento for válido
            if (moveResult.isValidMove) {
                let childNode = {
                    game: newGame,
                    bestScore: 0,
                    visits: 0,
                    children: [],
                    parent: node, // Referência ao nó pai
                    move: direction // Armazenar o movimento que levou a esse estado
                };
                node.children.push(childNode);
            }
        });
    }

    simulateGame(node) {
        let simulatedGame = new Game(JSON.parse(JSON.stringify(node.game.matrix)), node.game.score, node.game.highTile, node.game.comboStreak);

        let moveResult = {};
        let moves = 0;
        let maxMoves = this.simulationDepth; // Limitar o número de movimentos para evitar simulações muito longas
        let victory = false;
        // Simular o jogo até que termine ou o número máximo de movimentos seja alcançado
        while (simulatedGame.isAlive && moves < maxMoves) {
            let possibleMoves = ['up', 'down', 'left', 'right'];
            let move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]; // Escolher um movimento aleatório

            moveResult = simulatedGame.move(move);

            // Atualizar o estado vivo do jogo após cada movimento
            simulatedGame.isAlive = moveResult.isAlive;

            if (!moveResult.isValidMove) { // Se o movimento não for válido, tentar outro movimento
                continue;
            }

            if (simulatedGame.matrix.flat().includes(2048)) {
                victory = true;
                break;
            }

            moves++;
        }
        node.bestScore = victory ? 10000 : simulatedGame.score;
        // Retorna o resultado da simulação com base na pontuação alcançada
        return node.bestScore;
    }

    backpropagate(node, result) {
        let currentNode = node;

        while (currentNode) {
            currentNode.visits++;

            // Se for folha, usar o resultado da simulação

            if (currentNode === node) {
                currentNode.bestScore = result;
            } else {
                // Calcular a média dos scores dos filhos que já foram visitados
                let visitedChildren = currentNode.children.filter(child => child.visits > 0);
                let totalScore = visitedChildren.reduce((acc, child) => acc + child.bestScore, 0);
                currentNode.bestScore = totalScore / visitedChildren.length;
            }

            currentNode = currentNode.parent;
        }
    }

    bestMove() {
        let bestChild = null;
        let bestScore = -Infinity;

        // Mudança para escolher com base na melhor pontuação
        this.root.children.forEach(child => {
            if (child.bestScore > bestScore) {
                bestScore = child.bestScore;
                bestChild = child;
            }
        });
        return bestChild.move;
    }

    runSearch(iterations) {
        for (let i = 0; i < iterations; i++) {
            let node = this.selectNode(this.root);
            if (!node.game.isAlive) continue;
            this.expandNode(node);
            let result = this.simulateGame(node);
            this.backpropagate(node, result);
        }
        return this.bestMove();
    }
}

class MonteCarloDriver {
    constructor() {
        this.gameBoardElement = document.getElementById('game-board');
        this.createButton = document.getElementById('create');
        this.startButton = document.getElementById('start');
        this.stopButton = document.getElementById('stop');
        this.numSimulationsInput = document.getElementById('n_simulations');
        this.maxMovesInput = document.getElementById('simulation_depth');

        this.numSimulations = 1000;
        this.maxMoves = 300;
        this.game = new Game();
        this.mcst = new MonteCarloSearchTree(this.game, this.maxMoves);

        this.stop = false;

        this.addEventListeners();
        this.updateBoard();
    }

    addEventListeners() {
        this.createButton.addEventListener('click', () => {
            this.numSimulations = parseInt(this.numSimulationsInput.value, 10);
            this.maxMoves = parseInt(this.maxMovesInput.value, 10);

            this.game = new Game();
            this.mcst = new MonteCarloSearchTree(this.game, this.maxMoves);
            this.updateBoard();
        });

        this.startButton.addEventListener('click', () => {
            this.stop = false;
            this.playGame();
        });

        this.stopButton.addEventListener('click', () => {
            this.stop = true;
        });
    }

    updateBoard() {
        this.gameBoardElement.innerHTML = '';
        this.game.matrix.forEach(row => {
            row.forEach(value => {
                let tile = document.createElement('div');
                tile.classList.add('tile');
                if (value > 0) {
                    tile.textContent = value;
                    tile.classList.add(`tile-${value}`);
                }
                this.gameBoardElement.appendChild(tile);
            });
        });
    }

    playGame() {
        const step = () => {
            if (this.game.isAlive && !this.stop) {
                let bestMove = this.mcst.runSearch(this.numSimulations);
                this.game.move(bestMove);

                // Atualizar a pontuação e o movimento na tela
                document.getElementById('score').textContent = this.game.score;
                document.getElementById('move').textContent = bestMove;

                this.updateBoard();
                this.mcst = new MonteCarloSearchTree(this.game, this.maxMoves);

                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }

}