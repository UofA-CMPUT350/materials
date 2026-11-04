# Lab 11 Prep Problems

Author: Daniel Zhang

> [!WARNING]
> Due: November 17th 2026, 2:00pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-11-prep"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Sprite Batching (overview)

Recall that to draw sprites, we would iterate through each `sf::Sprite`, and for each call
`window.draw(sprite)` on it. Under the hood, this involves a *draw call* to the GPU, requiring the GPU to
synchronize with the CPU to transfer texture data and vertex information. Draw calls incur overhead on the CPU
to prepare the data, and requires the GPU to go through state changes to bind different textures or shaders.
Furthermore, making many calls with small batches is a mismatch with the GPU architecture — remember from [lab
10](../10/prep.md) that GPUs excel at processing lots of things at the same time, not at rapidly processing
individual items in serial.

Sprite batching is a process by which we collect all the sprite quads into a *single vertex buffer*, and
then make a single draw call to render all sprites at once. There are a few consequences to consider:

- *GPUs have limited texture units*: What this means is that for a single draw call, there is a maximum number
  of textures that you can bind and access within that draw call. For example, for the RTX 5090, querying
  `GL_MAX_TEXTURE_IMAGE_UNITS` yields a maximum of 32 concurrent textures in a draw call [+note1]

  When drawing a batch of sprites, all textures used by all the sprites together must be bound for the draw call.

- *GPUs support maximum texture sizes*: Further worsening the above point, each texture has a limited size.
  Thankfully, these are generally large enough for our use case. To give an example, the RTX 5090 supports a
  maximum texture width (and height) of 32768 [+note2]. On modern GPUs you can typically expect this to
  be at least 8192. You can also query this information from SFML using `sf::Texture::getMaximumSize()`.

- *Limitations on Sprite geometry representation and storage*: Finally, note that up until now, you may have
  been storing Sprites and transforms in an OOP or Array-of-Structures style. Your sprite geometry is almost
  certainly not stored contiguously in memory, neither are your transformations. Thus, to gather all the
  geometry up for a single draw call, we have two options:
    1. Use your original AoS storage and copy over everything to a centralized vertex buffer (and a centralized
       transforms buffer) each frame. As you can imagine, this might be slow.
    2. Have your sprite Manager *centralize storage of Sprite data*, like we've been doing for everything else
       in our ECS. In particular, if our sprite manager just maintains all sprite geometry in a single
       `sf::VertexArray` and a single `std::vector<BasicTransform>` by default (and hands out ids), then
       everything is already prepared to be drawn to the GPU on each frame.

Note that the points on texture limitations above are not as significant as bottlenecks if you draw each
sprite one-by-one, because the limitations are on *concurrent bindings*. For multiple draw calls, you can
simply unbind one texture and bind another (as you have been doing until now).

## Texture atlasing

To implement sprite batching, we must first store our textures in a way such that we need only bind a minimal
number of textures in order to obtain access to the textures for all of our sprites. One way
of doing this is to construct a *texture atlas* (aka a *spritesheet*). A texture atlas is just a single large
image which places the actual textures of interest side-by-side within itself, such that accessing a
particular texture is just a matter of setting your UV coordinates correctly within the single texture atlas.
You may have seen these before while e.g., setting a texture pack for Minecraft:

<ImageCard
  title="A texture atlas used for blocks in Minecraft Java Edition 1.21.9"
  image="https://minecraft.wiki/images/25w36a_blocks.png-atlas.png?6377f"
  href="https://minecraft.wiki/w/Blocks.png-atlas"
  width="90%"
  :center="true"
/>

One consideration when doing this is the algorithm you use to pack the textures. In general, the *rectangle
packing problem* is NP-hard — there is no currently known method to optimally pack rectangles into a larger
rectangular bin efficiently. For a survey on heuristic methods for rectangle packing, see
<a :href="$withBase('/static/resources/RectangleBinPack.pdf')" target="_blank">here</a>.
For example, those interested in a more optimal packing strategy might implement `MAXRECTS-BSSF-BBF`.

Another consideration in creating texture atlases is the effects of interpolation and mipmapping. Recall that
to smooth a texture, we may take a weighted average of the 4 surrounding pixels of a point in a process called
bilinear interpolation. Bicubic interpolation can use information from the surrounding 16 points. Placing two
textures side-by-side in your atlas in this case means that when you sample their edge pixels, the colors of
each texture *bleeds* into the other.

Another consideration is texture filtering — in particular, texture downsampling. Sampling a high-frequency
texture from far away leads to *aliasing* (e.g., moiré). To alleviate this, textures are downscaled
exponentially, whereby a convolutional filter blurs the texture and then the blurred texture is sampled such
that its width and height are halved at each step. Then, during 3D scene rendering, an appropriate texture
“mip level” is chosen to avoid aliasing. This blurring also causes texture bleeding. More information can be
found e.g., [here](https://en.wikipedia.org/wiki/Mipmap) and [here](https://en.wikipedia.org/wiki/Aliasing).

The upshot here is that texture atlases can cause texture bleeding unless you *pad* the textures with extra
pixels. Then, sampling the edges of constituent textures will blend with the edge padding pixels as opposed to
neighbouring textures. There are different edge behaviours you may need, e.g., just copying the closest valid
pixel from the original image, or cycling around to the other side of the image.

## OpenGL vertex shaders

In Lab 10, our focus was on fragment shaders, which allowed us to control the parallel per-fragment
computation of pixels overlapping with our scene geometry. In order to implement sprite batching efficiently,
we'll need to now perform computation over our geometry (vertices) in parallel, which is the responsibility of
the vertex shader.

While SFML provides handy convenience features for basic use cases, unfortunately it does not expose enough of
the underlying OpenGL for us to do sprite batching (efficiently). In particular, suppose we wanted to apply
each sprite's transform, in parallel. One way to do this is to set a 1D texture uniform containing all
sprites' transforms, and then in the vertex shader, index into the corresponding transform based on the vertex
index. SFML makes this basic idea difficult to implement for all the following reasons:

- Because SFML's graphics module uses legacy fixed-function pipeline features (only supported by a
  compatibility OpenGL profile after version 2.1), and because macOS only supports a core OpenGL profile after
  version 2.1, we are locked to OpenGL 2.1 (released in 2006).
- OpenGL version 2.1 does not support per-vertex indexing — given a particular invocation of a vertex shader,
  there is no way of knowing *which* sprite you are in without setting a *vertex attribute* for each vertex
  indicating its sprite number. In particular, `gl_VertexID`, which *does* give you the vertex index, only
  came out in OpenGL 3.0 (in 2008).
- To add additional vertex attributes (besides e.g. `position`, `texCoords`, `color`), we need to set OpenGL
  state using native OpenGL commands (SFML does not provide an equivalent). In particular we wish to add a
  vertex attribute corresponding to the sprite number (so that we can use it to index into the transforms
  list/texture).
- Furthermore, SFML's `sf::Texture` only provides support for exactly 1 byte per channel, with 4 channels
  total. This means each channel only stores the range of $0 \dots 255$ (and furthermore, this is normalized
  into a float on the shader side). To create a 1D texture (i.e., an array) of `BasicTransforms`, we need 4
  components ($scale.x, scale.y, translation.x, translation.y,$) with 4 bytes per component (making a `float`). While
  OpenGL supports textures
  with `float` components, SFML does not expose this functionality, meaning we need to perform native OpenGL
  commands to create the uniform.
- Finally, using SFML's `window.draw` takes control over the OpenGL state, disabling our previously set vertex
  attribute. Therefore, we need to call OpenGL's commands for drawing instead.

For all of these reasons, SFML is insufficient for us. Therefore, an OpenGL tutorial.

### Vertex attributes

Before you begin, make sure you've included the OpenGL headers. SFML provides a convenience header which
selectively includes for you based on your OS in `#include <SFML/OpenGL.hpp>`.

A vertex attribute is just a “component” you expect to see per-vertex. The typical examples are positions and
UV coords, but OpenGL allows you to configure these to anything you like. In old versions of OpenGL, you can
specify in the vertex shader that you are expecting specific vertex attributes (per vertex) with the
`attribute` keyword:

```glsl
// in your vertex shader GLSL code:
attribute vec2 position;
attribute vec2 texCoords;
attribute float spriteNumber;
// attribute int spriteNumber; // integer vertex attributes unsupported until OpenGL 3.0!
```

Note, that in newer versions of GLSL, `attribute` was replaced by `in`. But, that's not relevant to us today.

Once you've specified that you expect a vertex attribute in your vertex shader, the name of that attribute has
an integer *location* inside your shader program. On the CPU side (C++), you have to [+note3] query for
it like so:

```cpp
GLint positionAttribLocation = glGetAttribLocation(shaderProgramGLHandle, "position");
```

where `shaderProgramGLHandle` is the “reference”/“name”/“handle” that the OpenGL driver has assigned to the
program. SFML's `sf::Shader` stores this handle via `shader.getNativeHandle()`. On the host side, before you
do anything, tell OpenGL we're using this program:

```cpp
glUseProgram(shader.getNativeHandle());
```

Given that we have a vertex attribute specified in our shader program, how do we represent it on the host
side, and how do we get it to the GPU? The key points are:

1. OpenGL lets you upload arbitrary raw buffers of memory to the GPU via *buffer objects* (section [Buffer
   objects](#buffer-objects)).
2. You can then specify *how* each attribute is laid out/organized in this raw buffer via
   `glVertexAttribPointer` (section [Interpreting vertex attribute
   data](#interpreting-vertex-attribute-data)).

#### Buffer objects

You can create a buffer object *name* by calling (on the CPU side):

```cpp
GLuint myBufferObject; // GLuint is just OpenGL's unsigned int, guaranteed to be at least 32 bits.
glGenBuffers(1, &myBufferObject); // 1st param is the number of buffer names to store.
                                  // 2nd param is the address of an array of GLuints to store
                                  //    the buffer "names" in.
```

Note that in OpenGL convention, all names/references/handles are typically either `GLuint`s or `GLint`s. You
can think of these in a similar way that your `Registry`/`ComponentStorage` hands out ids: they are
essentially “pointers” within the active OpenGL context.

Conversely, to delete a buffer object,

```cpp
glDeleteBuffers(1, &myBufferObject);
```

The thing to remember is that OpenGL is a *state machine*. It has a context which stores state, and you
set/modify this state before making a draw call, whose result is directly determined by the state. That is
part of the reason why we cannot mix SFML's `window.draw` with our own OpenGL commands — `window.draw`
modifies this state before making the draw.

One part of this state are the state machine's *targets* and the buffer objects they are *bound to*. The
OpenGL state machine has only one of each target, and **each target can only be bound to one buffer object at
a time** (so modifying multiple buffer objects of the same “type” involves binding a target to one buffer
object, doing some commands on the target, and then rebinding that target to a different buffer object, etc.).
Newer versions of OpenGL has more targets, but the following two are essentially the only one you will need to
concern yourself with:

| Buffer Binding Target     | Purpose              |
|---------------------------|----------------------|
| `GL_ARRAY_BUFFER`         | Vertex attributes    |
| `GL_ELEMENT_ARRAY_BUFFER` | Vertex array indices |

You can bind a buffer object to a target via

```cpp
glBindBuffer(GL_ARRAY_BUFFER, myBufferObject); // first param is the target to bind to
                                               // second param is the handle to the buffer
                                               //   object to bind.
```

Once we've bound a buffer object name to `GL_ARRAY_BUFFER`, we can now actually create a data store for that
buffer object. As an example, suppose we have on the CPU side a

```cpp
sf::VertexArray vertices;
```

that we want to upload to the GPU to set the vertex attributes. We know from [SFML's source
code](https://www.sfml-dev.org/documentation/3.0.2/VertexArray_8hpp_source.html) that a `sf::VertexArray` is
just a `std::vector<sf::Vertex>` together with a `sf::PrimitiveType`. From [SFML's source code
again](https://www.sfml-dev.org/documentation/3.0.2/Vertex_8hpp_source.html) `sf::Vertex` has the following
layout:

```cpp
struct Vertex {
    sf::Vector2f position;  // 2 floats, with 4 byte alignment
    sf::Color color;        // 4 std::uint8_ts, with 1 byte alignment
    sf::Vector2f texCoords; // 2 floats with 4 byte alignment
};
```

This means that `sizeof(sf::Vertex) == 20`, and since a class/struct takes the maximum alignment of its
members (unless otherwise specified), it has an alignment of `4`. Note that the `position` takes up 8 bytes,
after which `sf::Color` (which does not require any alignment, since it has alignment 1) takes up the next 4
consecutive bytes. This means `texCoords` starts on the 12<sup>th</sup> byte, and no padding is required
because 4 divides 12 (meaning `texCoords`'s alignment is satisfied) and 4 divides 20 (meaning `sf::Vertex`'s
alignment is satisfied if you store a vector/array of them). **Always reason about the size, alignment, and
padding within your memory layouts before you specify a layout to OpenGL.**

Now, to upload this data into our buffer object, we need to call `glBufferData`, which has the following
signature:

```cpp
void glBufferData(GLenum target, GLsizeiptr size, const void* data, GLenum usage);
```

- `target` is just one of the targets like `GL_ARRAY_BUFFER`, `GL_ELEMENT_ARRAY_BUFFER`. These names are
  `#define`'d for you by the OpenGL header.
- `size` is the size **in bytes** of the data to buffer. Remember that OpenGL is completely unaware of your
  memory layout — it just knows it's getting a block of memory, so it makes no sense to pass the number of
  elements.
- `data` is just a pointer to the beginning of the memory block to be copied. Because this C-style interface
  is used, your data must be stored in some contiguous memory (e.g., you cannot use an iterator to a linked
  list).
- `usage` is a hint to the OpenGL driver about what the buffer is used for and how often it will be updated.
  The usage hint is broken down as a frequency $\times$ nature of access. Basically, for frequency:
    - `STREAM` means the the buffer is modified every frame.
    - `DYNAMIC` means the buffer is modified, less frequently but maybe every few frames.
    - `STATIC` means the buffer is almost never modified.

  and for nature of access:
    - `DRAW` means the buffer is modified by the CPU and used for drawing commands.
    - `READ` means the buffer is modified by the GPU, and read by the CPU.
    - `COPY` means the buffer will be modified by the GPU, and then directly used as a source for a draw command
      to the GPU.

  For example, for a buffer that you will modify on the CPU every frame and then use for drawing (e.g.,
  storing vertex attributes), you would use `GL_STREAM_DRAW`.

So we might make the following call to upload our `sf::VertexArray` into the `myBufferObject` bound to
`GL_ARRAY_BUFFER`:

```cpp
glBufferData(GL_ARRAY_BUFFER, mVertices.getVertexCount() * sizeof(sf::Vertex), &mVertices[0],
             GL_STREAM_DRAW);
```

Note that if you bind `GL_ARRAY_BUFFER` to a different buffer object name, then subsequent calls to
`glBufferData(GL_ARRAY_BUFFER, ...)` upload into that buffer object instead.

#### Interpreting vertex attribute data

Now that we have our raw vertex attribute data on the GPU, all that remains is to tell the GPU how to
interpret it. This is done via `glVertexAttribPointer`, which specifies the memory layout of a **specific**
vertex attribute within the buffer object **currently bound to the `GL_ARRAY_BUFFER` target**. which has the
following signature:

```cpp
void glVertexAttribPointer(
    GLuint index,
    GLint size,
    GLenum type,
    GLboolean normalized,
    GLsizei stride,
    const void* pointer);
```

where

- `index` is the *location* of the attribute in the shader program, like we found in the beginning of [Vertex
  attributes](#vertex-attributes).
- `size` is the **number of components** in this attribute. This must be `1`, `2`, `3`, or `4` (corresponding
  to `float`, `vec2`, `vec3`, `vec4` respectively).
- `type` is a GL enum indicating the type of each component **as stored in the buffer**. This can be e.g.,
  `GL_BYTE`, `GL_UNSIGNED_BYTE`, `GL_SHORT`, `GL_UNSIGNED_SHORT`, `GL_INT`, `GL_UNSIGNED_INT`, `GL_FLOAT`,
  among others.
- `normalized` is a GL boolean (i.e., either `GL_TRUE` or `GL_FALSE`) indicating whether fixed-point types (e.g.
  integers) should be normalized (to $[0, 1]$ for unsigned integer types, $[-1, 1]$ for
  signed). If `GL_TRUE`, the normalization is done w.r.t. the maximum value of the `type` specified earlier.
- `stride` indicates the number of bytes between each **the beginning** of each instance of the vertex
  attribute in your bound array buffer object.
- `pointer` is a bit of a misnomer, because it is just the offset value (in bytes) of the first instance of
  the attribute in the bound buffer object, casted to a `const void*`.

For example, assuming `GL_ARRAY_BUFFER` is still bound to `myBufferObject` (which we just buffered data for),
to specify the position attribute layout in memory we'd call:

```cpp
glVertexAttribPointer(
    positionAttribLocation, // location of our position attribute in the shader program
    2,                      // positions are vec2s
    GL_FLOAT,               // each component is stored as a float
    GL_FALSE,               // normalized flag is irrelevant for floats
    sizeof(Vertex),         // each position entry in a sf::Vertex occurs every sizeof(Vertex) bytes
    (const void*)0          // position is the first attribute in struct layout, so no offset needed
);
```

Then you have to call

```cpp
glEnableVertexAttribArray(positionAttribLocation);
```

which just enables the vertex attribute array corresponding to the position attribute for the draw call.

You can then do something similar for the `texCoords` vertex attribute:

```cpp
GLint texCoordsAttribLocation = glGetAttribLocation(shaderProgramGLHandle, "texCoords");
glVertexAttribPointer(
    texCoordsAttribLocation,
    2,
    GL_FLOAT,
    GL_FALSE,
    sizeof(Vertex),
    (const void*)(sizeof(sf::Vector2f) + sizeof(sf::Color))
);
glEnableVertexAttribArray(texCoordsAttribLocation);
```

The only thing that changed here was the final offset — we used `sizeof(sf::Vector2f) + sizeof(sf::Color)`
because the `texCoords` field of a `sf::Vertex` is stored after the position and the color fields. Remember
that in general you might also have to account for padding if there are alignment issues.

Another important thing to note is that your vertex attributes don't all have to be stored in the same buffer
objects. You can just as easily have stored a `std::vector<sf::Vector2f> positions` and a
`std::vector<sf::Vector2f> texCoords;` on the CPU, and created + bound + buffered two vertex buffer objects (one
corresponding to each vertex attribute). In this case, you would just have to make sure to bind the
corresponding buffer object to `GL_ARRAY_BUFFER` before specifying the corresponding attribute layout to
`glVertexAttribPointer` for each vertex attribute (because `glVertexAttribPointer` always works with respect
to the currently bound `GL_ARRAY_BUFFER`).

Once you set `glEnableVertexAttribArray`, this configuration is remembered, so you generally need to call it
again if your vertex attribute configuration changes between draw calls (e.g., if you run multiple shader
programs each frame, each with different layouts). Later versions of OpenGL support directly storing layout
settings in *Vertex Array Objects (VAOs)*, but since we're restricted to OpenGL 2.1, you will just have to
configure vertex attributes manually each frame.

### Uniforms

Suppose you have in your shader program the following uniforms:

```glsl
uniform vec2 windowSize;
uniform sampler2D texture;
```

You may query for the *location* of each uniforms via a call to `glGetUniformLocation` (on the CPU):

```cpp
GLint windowSizeUniformLocation = glGetUniformLocation(shaderProgramGLHandle, "windowSize");
GLint textureUniformLocation = glGetUniformLocation(shaderProgramGLHandle, "texture");
```

To set these uniforms, all you have to do is call the appropriate variant of `glUniform*` with the uniform
location, and then its value. The variants of `glUniform*` look like (in OpenGL 2.1) [+note4]

```text
glUniform[num components per entry][i|f, component type int/float][v? optional if array]
```

So, for `windowSize` which is just a 2D vector of floats, we call

```cpp
glUniform2f(windowSizeUniformLocation,
            static_cast<float>(window.getSize().x), static_cast<float>(window.getSize().y));
```

That's it, you can now access the uploaded `windowSize` in your shader.

#### Textures

However, textures are slightly more complicated, because `sampler1D`/`sampler2D`/`sampler3D` uniforms actually
just store an integer, referring to the *texture unit* that (has a target which is) bound to the texture data.
Suppose we have a RGBA texture **whose components are `float`s (i.e., 4 bytes each channel, not just 0-255)**.
`sf::Texture` does not support this texture format for us, so we need to handle it manually. Suppose it has
resolution $1280 \times 720$. We can store it on the CPU side as, e.g., `std::vector<float> image`, with size
$4 \times 1280 \times 720 = 3686400$.

First, to generate a texture name/handle/reference, analogously to our buffer object names:

```cpp
GLuint myTexture;
glGenTextures(1, &myTexture); // myTexture now stores an unsigned int ID for the texture.
```

(and conversely, to delete the texture is `glDeleteTextures(1, &myTexture);`). Now, we must specify an active
texture unit. Only one of these are active at a given time because they influence where textures get bound:

```cpp
glActiveTexture(GL_TEXTURE0); // sets the current active texture unit as texture unit 0
```

In general you can write `glActiveTexture(GL_TEXTURE0 + n);` to activate the $n$'th texture unit.
Generally there are at least 16 or 32 of these. You can query the limit via
`GLint maxUnits = 0; glGetIntegerv(GL_MAX_TEXTURE_IMAGE_UNITS, &maxUnits);`.

Once you have an active texture unit, you can bind a texture name to one of its targets, e.g.:

```cpp
glBindTexture(GL_TEXTURE_2D, myTexture);
```

The first argument is the texture target, which also indicates dimensionality. This can be e.g.,
`GL_TEXTURE_1D`, `GL_TEXTURE_2D`, `GL_TEXTURE_3D`. The second argument is just the texture name we generated
earlier. Once you have a texture bound to a target, you can specify the texture sampler settings:

```cpp
// clamp to nearest valid pixel if you sample outside of [0, 1]^2
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
// nearest neighbour sampling, can also use GL_LINEAR for linear interpolation.
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
```

Finally, to upload your texture data from CPU to GPU:

```cpp
void glTexImage2D(
    GLenum target,
    GLint level,
    GLint internalformat, // format to be stored ON THE GPU
    GLsizei width,
    GLsizei height,
    GLint border,
    GLenum format,        // format as uploaded ON THE CPU
    GLenum type,          // type of each channel ON THE CPU
    const void* data      // NOTE: data[0] is bottom-left pixel!
);
```

::: important

Note that OpenGL accepts texture data from the bottom row, left-to-right, then bottom-to-top. That is,
`data[0]` refers to the bottom-left pixel of the image, and the last entry is the top-right pixel! On the
other hand, SFML stores textures from top-bottom.

:::

You can read documentation [here](https://registry.khronos.org/OpenGL-Refpages/gl2.1/). In our case, we call

```cpp
glTexImage2D(
    GL_TEXTURE_2D, // target
    0,             // mip level is irrelevant for us, so just use the base 0.
    GL_RGBA8,      // our image has 4 channels, and we want out GPU to store it that way
                   //  Furthermore, each channel should have 8 bits, corresponding to 0...255
                   //  If you wanted to store a 32 bit float per channel, this would be
                   //  GL_RGBA32F_ARB instead (later versions of OpenGL allow GL_RGBA32F,
                   //  but it is an extension in 2.1)
    1280,          // width 1280
    720,           // height 720
    0,             // nobody uses this setting, ignore it.
    GL_RGBA,       // we stored the image with 4 channels on the CPU
    GL_FLOAT,      // we stored a float per channel on the CPU
    image.data()   // ptr to the pixel data on CPU
);
```

And that completes the upload the texture to the GPU, inside the texture object `myTexture` which was bound to
the target `GL_TEXTURE_2D` on texture unit `0`. Finally, to set the uniform sampler to see this texture, we
just need to set the uniform value to the integer corresponding to the texture unit:

```cpp
glUniform1i(textureUniformLocation, 0); // now uniform sampler "texture" sees texture bound to
                                        //  texture unit 0. The target within the texture unit
                                        //  that is chosen depends on the sampler type.
                                        //  e.g., for "uniform sampler2D texture",
                                        //  texture unit 0's GL_TEXTURE_2D target is used.
                                        //  If it were "uniform sampler1D texture", texture unit 0's
                                        //  GL_TEXTURE_1D target would be used.
```

As a side note, if `sf::Texture` works for the texture data you want to use, then it already provides to you
an OpenGL texture name (with the data uploaded). You can e.g., bind a `sf::Texture` to texture unit 0 as
follows:

```cpp
sf::Texture sfmlTexture;
// initialize the data as you normally do here...
glActiveTexture(GL_TEXTURE0);
glBindTexture(GL_TEXTURE_2D, sfmlTexture.getNativeHandle());
```

Again, SFML stores textures differently from how OpenGL expects it, so the texture will be upside-down unless
you fix the tex coords in the vertex shader...

### Drawing

Remember that SFML's `window.draw(...)` takes over the OpenGL state and sets it for us (that's why it was so
convenient). However, this also makes it impossible for us to mix it with our own OpenGL commands which also
modify the state — once we pass control over to SFML, it will overwrite our desired state.

To do a draw call with OpenGL, let's first do some setup during initialization:

```cpp
glEnable(GL_BLEND);                                // allows for blending transparency
glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA); // uses alpha compositing formula, as covered
                                                   //  in lab 8.
glClearColor(1, 0, 0, 1);                          // set clear color to red
```

Now, you can call

```cpp
glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
```

to clear both the color and the depth buffers. Finally, call

```cpp
glDrawArrays(GL_TRIANGLES, 0, vertices.getVertexCount());
```

where the first param takes the interpretation of how to combine the vertices into primitives (`GL_TRIANGLES`
just takes every 3 and combines them as a triangle), the second param is the starting index, and the last
param is the number of vertex indices. Note that each vertex attribute array (as you specified with
`glVertexAttribPointer`) must have at least `vertices.getVertexCount()` elements in this case.

You still need to rely on SFML to handle swapping buffers:

```cpp
window.display();
```

### Debugging

After any OpenGL command is run on the host, you can check if there was an error using
`int e = glGetError();`. It's good practice to run this after every command to ensure there were no issues, as
OpenGL tends to fail silently (it does not crash, but rather just allows strange behaviour). Here's a helper
macro which you can wrap most [+note5] OpenGL commands with:

```cpp
// helper macro which checks if errors have occurred.
#define glCheck(expr)                                                                              \
    expr;                                                                                          \
    if (int e = glGetError()) {                                                                    \
        std::cerr << "OpenGL error: " << e << " in file " __FILE__ << ", line number " << __LINE__ \
                  << '\n';                                                                         \
        abort();                                                                                   \
    }

// use like
glCheck(glGenTextures(1, &texture));
// or for commands which return values
GLint positionAttribLocation = glGetAttribLocation(shader.getNativeHandle(), "position");
glCheck();
```

A list of error codes and the name they correspond to can be found
[here](https://learnopengl.com/In-Practice/Debugging). Each OpenGL command has documentation about when each
error flag will be raised (e.g., see `glDrawArrays`
[here](https://registry.khronos.org/OpenGL-Refpages/gl2.1/) and look under “Errors”).

### A complete example

Here's a repo with a complete example of drawing using OpenGL.

<RepoCard repo="UofA-CMPUT350/opengl-demo"></RepoCard>

## Problems

1. *Rectangle packer*. Inside `texture_atlas.h`, implement `RectPacker`. Its constructor just takes a single
   `const sf::Vector2f& size`, determining the size of the large rectangular bin in which we will pack all
   future rectangles.

   `RectPacker` will pack rectangles according to the algorithm you saw in class. In particular, you begin
   with a horizontal line at $y = 0$ (the top). Pack incoming rectangles along this line
   left-to-right until the next one does not fit. At this point, move this line down to align with the bottom
   of the tallest rectangle seen in the line of textures, and reset your x offset to the left side. Keep
   doing this until you cannot even fit a given rectangle vertically given maximal horizontal space.

   Implement the following methods:

   ```cpp
   // pack returns { succeeded, rect id }. If not succeeded, id is irrelevant (but ideally should
   // be set to the maximum possible value).
   std::pair<bool, size_t> pack(const sf::Vector2f& rectSize)
   ```

   and

   ```cpp
   // Returns the coordinates and size of a previously returned rectangle id.
   // Note that in this coordinate system, y points downwards from the origin at the top-left.
   sf::FloatRect getBounds(size_t rectID) const
   ```

2. *Image padding*. Implement the following function:

   ```cpp
   inline sf::Image padImage(const sf::Image& img, uint pixels)
   ```

   which returns a new image with `pixels` pixels padded along all of the top, bottom, left, and right sides.
   This new image will have size $(origWidth + 2 \cdot pixels, origHeight + 2 \cdot pixels)$. For each pixel, use the
   colour of the closest valid pixel
   from the original image (which will be copied over into the center of this new image). For example, all
   pixels in the padding to the right of the image sample the right-most pixel from the original image in the
   same row as the padding. Pixels in the padding in the bottom-left will sample exactly the bottom-left
   corner of the original image.

3. *Texture atlas*. Write a class `TextureAtlas` with the following private fields:

   ```cpp
   class TextureAtlas {
   public:
       // ...
   private:
       sf::Texture mTexture;
       RectPacker mPacker;
       uint mPadding;
   };
   ```

   Its constructor should take a 2D vector corresponding to the size of the atlas (in pixels), and the amount
   of padding (as a `uint`). Implement the following methods:

   ```cpp
   TextureID registerTexture(const std::string& filepath)
   ```

   which given a filepath to an image, loads it, pads it, and then packs the resulting rectangle (accounting
   for padding). Then, using the packing information, the padded image is written into the overall
   `mTexture`. Finally, a texture ID is returned. For this lab, this does not have to be idempotent — we will
   assume that if the user wishes to reuse a texture, they will just reuse the previously returned texture ID (and
   otherwise they just want a copy of the same texture).

   Then write the method

   ```cpp
   sf::FloatRect getBoundsUV(TextureID id) const
   ```

   which given a texture ID, returns the bounds **in OpenGL texture UV space** of the corresponding **unpadded
   texture**. Recall that in OpenGL, UV coords have their origin at the bottom-left of a texture
   and $(1, 1)$ at the top-right. Furthermore, our rectangle packer treated the top-left as its
   origin.

   Next, write the following method:

   ```cpp
   sf::Vector2u getSizePixels(TextureID id) const
   ```

   which is just the size in pixels of the **unpadded texture** corresponding to the texture ID

Once you're done these problems, building and running with the provided `main.cpp` should give you the
following `atlas.png` in your `build` folder:

<ImageCard
  image="/static/img/atlas.png"
  width="80%"
  :center="true"
/>

You will need to squint your eyes a bit at the edges of sub-textures to make sure the padding is actually
working.

[+note1]: See [here](https://gfxbench.com/device.jsp?benchmark=gfx50&D=NVIDIA+GeForce+RTX+5090&testgroup=info). We are
  also ignoring concepts such as bindless textures.

[+note2]: As can be observed by querying `GL_MAX_TEXTURE_SIZE`
  [here](https://gfxbench.com/device.jsp?benchmark=gfx50&D=NVIDIA+GeForce+RTX+5090&testgroup=info).

[+note3]: Newer versions of GLSL (3.3+) allow you to explicitly set it in the shader.

[+note4]: Later versions of OpenGL support unsigned integers as well. I've also just omitted matrix variants, which
  allow you to upload matrices or arrays of matrices.

[+note5]: Except for those which return values directly.
