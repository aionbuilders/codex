let data = {todos: [{id: 1, text: 'Learn Svelte', done: false}], info: 'My todo list'};

console.log(data);

const newTodo = {
    id: 2,
    text: 'Build a Svelte app',
    done: false
}

data = {todos: [...data.todos, newTodo], ...data, todos: []};

console.log("\n------------\n")

console.log(data);
