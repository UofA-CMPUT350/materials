# Lab 2 Prep Problems

*Authors: Daniel Cui, Jake Tuero, Daniel Zhang, Junwen Shen*

> [!WARNING]
> Due: September 8th 2026, 2:00pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-2-prep"></RepoCard>
> Click `Use this template` button to create your repo based on it  
> Make sure you are able to compile and run the binary using the following commands
> ```shell
> # In `lab-2-prep` folder
> cmake --preset debug # On lab machine, use `cmake -S . -B build` instead
> cmake --build build
> chmod u+x build/flappy
> ./build/flappy
> ```

> [!IMPORTANT]
> Read the following pages before working on the preparation problem
> - [C++ Prerequisite](cpp)
> - [SFML Prerequisite](sfml)

You are provided with a partially completed implementation of *Flappy Bird* in `main.cpp`. Several critical functions
are incomplete or missing key functionality. Your task is to analyze the code structure and implement the missing pieces
to create a fully functional game. **Further instructions are provided in the comments of the code.**

1. **Bird Object Management.** The game requires a bird that can be displayed and interacts with the game world. We will
   use a simple yellow circle to represent the bird with the following properties:
    - Initial position: $(100.0, 400.0)$
    - Initial size (radius): $15.0$
    - Initial colour: yellow

   **Problem**. Analyze the global variables and incomplete functions to determine:
    - How to properly initialize the bird object with appropriate size, color, and starting position. You should
      initialize the colour, initial position, and size of the bird as global variables.
    - Where and how the bird should be rendered to the screen
    - What properties the bird object needs to have for the game to function

2. **User Input and Game Response.** The bird must respond to player commands to create an interactive experience.

   **Problem**. Examine the event handling structure and implement:

    - Detection of relevant user input (space key)
    - Appropriate game state changes in response to input (jump)
    - Audio loading and feedback for the jump sound. Remember to error check the loading of the sound. If the sound
      fails to load, you should print `Warning: Could not load jump.wav` to the console.
    - Note: if you build your executable in the `build` dir, but use a path like `assets/jump.wav`, you will have to run
      the executable from the main project directory, not `build`, because the path is relative to where you’re running
      it from.

3. **Game Physics and Boundaries.** The bird must follow realistic movement patterns and the game must handle if the
   bird escapes screen boundaries.

   **Problem**. Study the existing physics variables and implement:

    - Proper position updates for the bird based on current velocity and game state
    - Boundary detection and appropriate responses when limits are exceeded
    - Game state management when boundary conditions are violated

   Think about what should happen when the bird moves outside the playable area and how to maintain game flow.

4. **Collision System.**

   The game must detect and respond to collisions between game objects.

   **Problem**. Implement a collision detection system that:

    - Determines when the bird intersects with obstacles
    - Handles collision events appropriately
    - Maintains consistent game behavior across different collision scenarios

   For the purposes of this prep, it is sufficient to consider the axis-aligned bounding box (rectangle) of the bird
   instead of the bird’s circle itself when detecting collisions.

   Apply your knowledge of bounding boxes and intersection detection in SFML.

## Requirements

- Your implementation must compile without warnings
- The game must be playable and responsive
- All game mechanics must function as expected in a typical Flappy Bird implementation
- Code must be well-structured and readable
