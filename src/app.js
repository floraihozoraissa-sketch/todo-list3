App = {
  loading: false,
  contracts: {},

  load: async () => {
    await App.loadWeb3()
    await App.loadAccount()
    await App.loadContract()
    await App.render()
  },

  loadWeb3: async () => {
    // 1. Prioritize MetaMask's modern window gateway interface
    if (window.ethereum) {
      // Save the provider to App.web3Provider so loadContract can access it
      App.web3Provider = window.ethereum;
      window.web3 = new Web3(window.ethereum)
      try {
        // Triggers safe, manual user permission approval
        await window.ethereum.request({ method: 'eth_requestAccounts' })
      } catch (error) {
        console.error("User denied account access", error)
      }
    }
    // 2. Legacy dApp bridge fallback framework
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
      window.web3 = new Web3(window.web3.currentProvider)
    }
    // 3. Fallback for environments lacking extension access
    else {
      console.log('Non-Ethereum browser detected. Consider trying MetaMask!')
    }
  },

    loadAccount: async () => {
    return new Promise((resolve, reject) => {
      web3.eth.getAccounts(function(error, accounts) {
        if (error != null) {
          console.error("An error occurred fetching accounts:", error);
          reject(error);
        } else if (accounts.length === 0) {
          console.log("MetaMask is locked. Please unlock your extension wallet!");
          resolve();
        } else {
          App.account = accounts[0];
          console.log("Connected account:", App.account);
          resolve();
        }
      });
    });
  },

  createTask: async () => {
    App.setLoading(true)
    const content = $('#newTask').val()
    await App.todoList.createTask(content, { from: App.account })
    window.location.reload()
  },

  toggleCompleted: async (e) => {
    App.setLoading(true)
    const taskId = e.target.name
    await App.todoList.toggleCompleted(taskId, { from: App.account })
    window.location.reload()
  },


  loadContract: async () => {
    // Fetch the JSON artifact created during truffle compile
    const todoList = await $.getJSON('TodoList.json')
    
    // Create a wrapper around the JSON structure using TruffleContract
    App.contracts.TodoList = TruffleContract(todoList)
    
    // Fix: Connect the contract directly to our MetaMask web3 provider
    App.contracts.TodoList.setProvider(App.web3Provider)

    // Pull a deployed instance of the contract from your running Ganache chain
    App.todoList = await App.contracts.TodoList.deployed()
    console.log("Smart Contract successfully loaded. Address:", App.todoList.address)
  },

  render: async () => {
    // Prevent double render
    if (App.loading) {
      return
    }

    // Update app loading state
    App.setLoading(true)

    //Render Account
    $('#account').html(App.account)

    // Render Tasks
    await App.renderTasks()

    //Update loading state
    App.setLoading(false)
  },

  renderTasks: async () => {
    //Load the total task count from the blockchain
    const taskCount = await App.todoList.taskCount()
    const $taskTemplate = $('.taskTemplate')

    //Render out each task with a new task template

    for(var i = 1; i <= taskCount; i++){
        // Fetch the task data from the blockchain
      const task = await App.todoList.tasks(i)
      const taskId = task[0].toNumber()
      const taskContent = task[1]
      const taskCompleted = task[2]

        // Create the html for the task
      const $newTaskTemplate = $taskTemplate.clone()
      $newTaskTemplate.find('.content').html(taskContent)
      $newTaskTemplate.find('input')
                      .prop('name', taskId)
                      .prop('checked', taskCompleted)
                      .on('click', App.toggleCompleted)

       // Put the task in the correct list
      if (taskCompleted) {
        $('#completedTaskList').append($newTaskTemplate)
      } else {
        $('#taskList').append($newTaskTemplate)
      }
      //show the task

      $newTaskTemplate.show()


    }


  },

  setLoading: (boolean) => {
    App.loading = boolean
    const loader = $('#loader')
    const content = $('#content')
    if (boolean) {
      loader.show()
      content.hide()
    } else {
      loader.hide()
      content.show()
    }
  }
}

// Coordinate execution safely alongside jQuery's bootstrap event cycles
$(() => {
  $(window).on('load', () => {
    App.load()
  })
})
