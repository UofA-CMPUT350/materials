# Lab 11 Exercise Problems

Author: Daniel Zhang

> [!WARNING]
> Due: November 17th 2026, 11:30pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-11-exercise"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Problems

1. *Sprite Manager*. Inside `sprite_manager.h`, write a Sprite manager which performs batched rendering of
   sprites. It should have constructor:

   ```cpp
   SpriteManager(const sf::Vector2u& atlasSize, uint padding)
   ```

   and it should store at least a `sf::VertexArray` (which stores 6 vertices per sprite, comprising to
   triangles to form a quad) which is rendered, a `BasicTransform` for each sprite, an atlas, and a shader.

    1. Implement

       ```cpp
       TextureID registerTexture(const std::string& filepath)
       ```

       which just registers the texture into the texture atlas and returns the resultant texture ID.

    2. Then implement

       ```cpp
       SpriteID createSprite(TextureID textureID)
       ```

       which creates a sprite whose geometry quad is the same size as its texture, but in “world units”. This
       quad shall have its bottom-left corner at $(0, 0)$ and its top-right corner
       at $(\text{texture width}, \text{texture height})$
       in world units. Of course, it is expected to have the appropriate UV coordinates corresponding to the
       **unpadded** corners of its texture. Finally return a `SpriteID` (which is just a `size_t`) which
       corresponds uniquely to this sprite. Each sprite also has a default-initialized `BasicTransform`.

    3. Next implement

       ```cpp
       void setTexture(SpriteID sprite, TextureID newTexture)
       ```

       which adjusts the UV coordinates of the vertices corresponding to the passed sprite to now display the
       new texture. Furthermore, the sprite should be resized to be the same size as the given texture, and
       still have its bottom-left corner at the origin.

    4. Implement the two trivial getters:

       ```cpp
       BasicTransform& getTransform(SpriteID id)
       ```

       and

       ```cpp
       const TextureAtlas& getAtlas() const
       ```

    5. *Batched rendering (part 1)*. Inside

       ```cpp
       void draw(sf::RenderTarget& target, sf::RenderStates states)
       ```

       Implement batched rendering. First, create a temporary `sf::VertexArray` and copy over the original
       vertices from all managed sprites. Then, apply the appropriate sprite transformation to each vertex in
       this temporary vertex array. Finally, draw the vertex array making use of your atlas and your shader.
       You should implement the vertex shader in `main_sfml.vert`. The fragment shader in `main.frag` is
       already complete.

       In your vertex shader, you should implement `cameraPos(vec2 worldPos)` which converts world
       coordinates ($(0, 0)$ at the bottom-left to $(1280, 720)$ on the top-right) to the first two
       coordinates of clip space (in $[-1, 1]^2$, where $y = -1$ is the bottom). You will need to
       output to `gl_Position` a 4D clip space vector and `texCoordsOut` a 2D UV coordinate.

       Upon completion of this problem, you have enough to complete the written problems. **We suggest at
       least looking at those first at this point**. Your program should look something like this:

       <ImageCard
       title="A particle system"
       image="/static/img/lab11.png"
       width="100%"
       :center="true"
       />

    6. *Batched rendering (part 2)*. We want to perform transforms in parallel on the GPU, in the vertex
       shader. We will need a new vertex attribute, `float spriteNumber`, in our vertex shader. Note that
       GLSL 1.2 does not support integer vertex attributes.

       Because we now want to supply custom vertex attributes, we can no longer rely on SFML's `window.draw`
       to setup our position and UV attributes automagically for us. In `main.vert`, we've declared the
       following attributes:

       ```glsl
       attribute vec2 position;      // "world" position of this vertex
       attribute vec2 texCoords;     // uv coords of this vertex
       attribute float spriteNumber; // sprite index/ID this vertex belongs to
       ```

       and the following uniforms:

       ```glsl
       uniform sampler1D transforms; // a 1D texture of ALL sprite transforms,
                                     // where each BasicTransform is stored as a vec4.
       uniform int numTransforms; // The number of transforms in transforms.
       ```

       Copy over your `cameraPos` implementation from `main_sfml.vert` and your logic for setting
       `texCoordsOut`. This time, sample the `transforms` 1D texture by using your sprite number to obtain
       the sprite `BasicTransform` as a `vec4`. Apply the transform to the `position` attribute and return
       the result (with appropriate 3rd and 4th coordinates) to the `gl_Position`.

       On the CPU side, you will need to add a field to your `SpriteManager` to store a buffer of all sprite
       numbers for each vertex, separate from your `sf::VertexArray`. You will need to update `createSprite`
       to also generate this vertex attribute for each of the 6 new vertices generated per sprite. Also,
       change your shader constructor to use `main.vert` instead of `main_sfml.vert`.

       In the constructor, obtain the shader locations of each vertex attribute using `glGetAttribLocation`.
       Store these locations as fields in your `SpriteManager`. Then obtain the shader locations of each
       uniform (these are `texture`, `transforms`, and `numTransforms`) using `glGetUniformLocation`. Also
       store these locations as fields in your `SpriteManager`.

       Furthermore, using `glGenBuffers`, generate two buffer object names — one for the GPU-side copy of
       your `sf::VertexArray` and one for the GPU-side copy of your sprite numbers buffer. Next use
       `glGenTextures` to generate a name for the GPU-side copy of your transforms list.

       Make sure that any generated buffers/textures are deleted when appropriate...

       Inside `drawGL`, call `glUseProgram(mShader.getNativeHandle())` and then bind + upload your vertex
       data and your sprite number data to the appropriate buffer objects. Use `glVertexAttribPointer` to
       tell OpenGL how to interpret these buffer objects for the vertex attributes. Enable appropriate vertex
       attributes using `glEnableVertexAttribArray`.

       Then, with two different texture units, bind and upload your transforms texture and your atlas
       texture.

       Finally, upload the non-texture uniforms directly. Call `glDrawArrays` appropriately to perform the
       draw call.

       In `main.cpp`, at the bottom there are marked blocks which should be commented or uncommented once
       you've completed your implementation. Follow these hints.

2. *Written problems*. Answer each in two-three sentences each in `written.txt`.
    1. We have already implemented logic for you which times your FPS for you. Because it uses an EMA, it
       starts off with an incorrect value and eventually converges.

       Build your batching solution and allow the FPS to converge. Record it. Then, temporarily rename your
       `main.cpp` to something else and rename `main_nobatch.cpp` to `main.cpp`. This file has an equivalent
       program, but just uses `sf::Sprite` without batching. Record the FPS of this program once it converges
       too. Compare the results. Make sure to revert the filename changes once you're done.

    2. OpenGL is a 3D rendering framework. Discuss briefly, one method of implementing depth in your sprite
       rendering which involves minimal additional work from you by exploiting the rasterization pipeline.
