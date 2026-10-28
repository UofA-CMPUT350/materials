# Lab 10 Prep Problems

Author: Daniel Zhang

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-10-prep"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Parallel computation

General purpose CPUs excel at minimizing latency [+note1] while performing sequential operations with
complex dependency graphs. For many applications, this is great — many tasks, when expressed as code, are
serial programs which only need to be run on very specific inputs one-at-a-time. Thus the goal when designing
a processor to complete these tasks would be one which completes each operation as fast as possible.

However, visualizing the computational graph of functions taking inputs, and the dependencies of inputs on
prior function outputs, many computations are independent of eachother. On your modern desktop, you have many
independent applications. To access this webpage, you have a web browser. To write your code, you have an IDE.
To access our class discussions, you have Discord. The program for each respective application each has its
own logic, but the code running on each is entirely independent of the code that needs to be run for any other
program. For this reason, such programs can be run *in parallel* (simultaneously).

On CPUs, this type of parallelism is achieved via two innovations:

1.  At a hardware level, your CPU has multiple physical cores, each of which has multiple *threads* (logical
    cores). Each physical core has an execution engine, caches, and thus can execute instructions
    independently and simultaneously with the other physical cores. Each logical core gets its own set of
    registers, but must share the execution engine of the physical core its associated to. The benefits of
    this are seen when a particular thread stalls (e.g. from a cache miss), and thus the CPU can have another
    logical core use the execution engine while waiting for the data retrieval on the first logical core.
2.  At the OS level, processes can schedule (software) threads, which can time-share on logical cores. This
    means that each physical core corresponds to multiple logical cores, which then in turn correspond to
    potentially many software threads. Intuitively, this means that each software thread gets small slices of
    time to operate on a logical core, and these slices are interleaved via context switches. Context switches
    involve saving the program state (PC, registers...) and are orders of magnitude slower compared to the
    sharing done by logical cores on a hardware core. However, time-sharing achieves *concurrency* (not true
    parallelism), which is the illusion of managing multiple tasks at once.

Since each core is expected to have low latency and to be capable of complex computation, it is expensive to
have many of these in a single CPU. A strong desktop processor in 2025 would be the AMD Ryzen 9 9950X, which
can be obtained for about \$800 CAD, and features 16 hardware cores (with 2 logical cores each for 32
logical cores total), each with a base clock of 4.3 GHz. This means that the maximum “true parallelism” such a
processor could achieve is 16 independent and parallel lines of execution at once [+note2] — any more
than that requires time-sharing, which slows down the execution speed of the threads.

The lesson here is, the more “independent” your lines of computation are (and the better your ability to spot
this), the more you can parallelize the computation. But for arbitrary simultaneous lines of computation, this
is (monetarily) expensive to achieve at scale. To bring the cost down, we make one more assumption which is
practical in our use case: not only are the lines of computation independent (in terms of their data
dependencies), but these lines **also run (nearly) the same instruction as each other line at each step of
their execution**. Graphics processing units (GPUs) exploit this assumption to achieve massively parallel
throughput of computation at consumer-scale costs on tasks such as computer graphics and ML.

### Intuitions on GPU architecture

A fully in-depth coverage of GPU architecture is beyond the scope of this course. However, it is to your
benefit to have an intuition on the broad strokes of how they are designed so that you can write your GPU
programs (shaders/kernels) effectively.

**ELI5**: A CPU is basically a small amount of very general-purpose and powerful processors, which can context
switch between threads and compute arbitrary instructions with minimal latency but with limited parallelism. A
GPU is basically a large amount of slower and less capable processors, which are segmented into groups. Each
processor inside one of these groups **must execute the same instruction as the rest of the processors in the
group are executing, in lockstep**. Such groups are called *warps* (Nvidia) or *wavefronts* (AMD). Typically a
warp is a group of 32 “threads” (but possibly 64 on AMD wavefronts). This tradeoff makes GPUs more suitable
than CPUs for high-throughput processing of tasks which are independent but similar — these tasks just run on
different data. On the other hand, such an architecture is not well suited for cases when your independent
tasks are completely dissimilar, since the lockstep computation across processors in a group means most of
that computation is wasted.

This design of modern GPUs is called “single instruction, multiple threads” (SIMT), because one instruction is
executed in parallel across GPU “threads”. While this design choice gives us high-throughput parallel
processing, there are some consequences we must consider:

#### Recursion is largely unsupported

Because so many cores share the VRAM of a GPU, there is very limited stack space to use for each thread. For
this reason, recursion is generally not supported in the OpenGL Shading Language (GLSL), nor the Open
Computing Language (OpenCL), and has severe limitations in languages which do support it (e.g., CUDA).

#### Warp divergence

Because of the lockstep-nature of execution inside a warp of threads, branches (e.g. if-statements) can cause
performance bottlenecks. In particular, if within a warp threads take different branches on an if-statement,
this means the GPU needs to execute one branch *for all threads in the warp*, *mask out the output for the
threads that need the other branch*, and then execute the other branch again for all threads in the warp.

Together with the fact that global memory access is quite slow (will lead to stalls) on GPUs, patterns where
you cache a value and then use an if-statement to check the cache are not always as idiomatic in GPU
programming as they are for CPU programming.

#### Memory hierarchy

GPUs have their memory generally divided as follows:

- *Global memory*: the largest memory pool in a GPU, on the order of gigabytes, which is accessible by all
  threads. Slowest to access.
- *Shared memory*: Memory which can be shared within a “workgroup” (thread block). This is a smaller and
  faster memory pool resident per streaming multi-processor, with the drawback that synchronization between
  threads on shared memory can only be done between threads in the same workgroup.
- *Constant memory*: A fairly small pool which is cached for fast access, but read-only and can be shared
  between all threads.
- *Private/local memory*: Per-thread memory, which is quite limited. If private memory usage exceeds the
  register space, it can spill over into global memory.
- *Texture memory*: Read-only memory access for textures, which is optimized for 2D/3D data access patterns.

#### Memory coalescing

TL;DR: If threads in a warp access consecutive global memory locations at the same time, the data load for a
warp can be optimized into a single data load, minimizing stalls that would otherwise happen if each thread
was accessing completely separate memory locations.

### The rasterization pipeline

Rasterization is one of the earliest 3D rendering techniques which describes how to map and draw your world
geometry (a vector representation using triangles in world-space) to pixels. Because of its massive efficiency
delta over techniques such as path tracing, it is still the de facto rendering technique used in most games
today, despite not being easily conducive to physically correct lighting effects.

The rasterization pipeline consists of the following stages:

1.  *Vertex processing*, in which the programmable *vertex shader* is executed for each vertex (and its
    attributes) that was passed from the host (CPU).
2.  *Vertex post-processing*, in which each processed vertex is clipped, and clip-space points are converted
    to normalized device coordinates (NDC) space (i.e., in $[-1, 1]^3$) via a perspective divide (i.e.,
    dividing all 4D clip-space vectors by their w component).
3.  *Rasterization*, in which a sequence of *fragments* is generated for each primitive (corresponding to the
    screen pixels that primitive occupies).
4.  *Fragment shading*, in which the programmable *fragment shader* is executed for each fragment that was
    generated in the rasterization step.
5.  *Per-sample processing*, which does things like depth-testing before actually writing to the output
    buffer.

In the above, the vertex and fragment shaders are GPU programs (which you can write) which are run
per-vertex/per-fragment, in parallel (to the extent the hardware can support). In modern GPUs, vertex and
fragment shaders are run on the same cores (just at different points in time), under a 
[unified shader architecture](https://en.wikipedia.org/wiki/Unified_shader_model). 
This was not always the case. Originally, dedicated hardware was used for different stages, trading off certain 
functionalities at stages for e.g., cost-savings.

The job of the vertex shader is to take vertices in an object's local coordinate system, and to perform the
following transformations:

1.  *Local coordinates $\rightarrow$ world coordinates*. This mapping is represented using the “model
    matrix”, which is given by e.g., `sf::Transform`, or in the case of the `Sprite` we built, the
    `BasicTransform`.
2.  *World coordinates $\rightarrow$ camera coordinates*. The camera coordinates is simply a translation and
    a rotation on world coordinates such that the origin is at the “camera position”, and the direction the
    camera is facing is exactly down the $-z$ axis. A matrix which does this mapping is called the
    *view matrix*.
3.  *Camera coordinates $\rightarrow$ clip space*. Clip space is the 4D homogeneous representation of a
    scene, that, after dividing $x, y, z$ by the fourth $w$ component, results in a cube in
    $[-1, 1]^3$ corresponding to the viewable volume in a frustrum. See the below link for a
    visualization. In NDC, $z = -1$ is the “near plane” of the camera and $z = 1$ is the “far
    plane” (and similarly $x = -1$ is the left side, etc.). A matrix which does this mapping is called
    the *projection matrix*.

An excellent visualization of these conversions is found [here](https://jsantell.com/model-view-projection/).

The vertex shader furthermore may process per-vertex attributes (e.g., normal vectors, uv coordinates, etc.)
and pass them along. The rasterization pipeline allows for the smooth interpolation of such attributes for any
arbitrary pixel which intersects with the primitive, which means that you can e.g. compute transformations per
vertex instead of per-pixel.

The job of the fragment shader is to take the fragments generated by the rasterization stage and to colour
them. A fragment is *basically* a screen pixel, except that multiple fragments may correspond to a single
pixel if, e.g., multiple primitives overlap that pixel (and hence a fragment is generated for each primitive
on the pixel).

### Programming in GLSL

GLSL is a C-like programming language which is used as the shader language [+note3] for OpenGL (which
SFML depends on for its window and drawing). It has some extra built-in types, such as vectors (of
dimensionality up to 4):

```glsl
vec4 v = vec4(1.0, 2.0, 3.0, 4.0);
```

Vectors can be conveniently concatenated like so:

```glsl
vec2 x = vec2(1.0, 2.0);
vec2 y = vec2(3.0, 4.0);
vec4 z = vec4(x, y); // 1, 2, 3, 4
```

Vectors can be *swizzled*, whereby you can take any 4 copies of any of its components in any order as a new
vector:

```glsl
vec2 a = vec2(1, 2);
vec4 aSwizzled = a.xyxy; // 1, 2, 1, 2
vec4 b = aSwizzled.wwyx; // 2, 2, 2, 1
```

There are built-in functions like `sin`, `mod`, etc. See [here](/static/resources/glsl_quickref.pdf). 
[Web references](https://registry.khronos.org/OpenGL-Refpages/gl4/) and [quick reference cards](https://www.khronos.org/files/opengl45-quick-reference-card.pdf) can also be found on the Khronos
group's site, but are generally for newer versions of OpenGL (the last two are for OpenGL 4.5).

A vertex shader is expected to output a 4D clip-space vector to `gl_Position`.

In old versions of OpenGL (e.g. version 2.1, which SFML forces us to use if we want to support macOS and use
the Graphics module), a fragment shader is expected to output a 4D colour vector to `gl_FragColor`.

#### Vertex attributes

Vertices in general can be configured with multiple attributes. In the system SFML has setup, they only
provide positions, color, and texture coordinates. In 3D systems you may also want for example, a normal
vector per vertex.

The cool thing about vertex attributes is that they can be interpolated across each fragment. In newer
versions of GLSL, the keywords to lookup are `flat` and `smooth`. However, for this lab and for compatibility
reasons we are stuck with GLSL 1.2, which always interpolates vertex attributes by default.

Here's an example of a setup which has a vertex attribute, `normal` per-vertex, which is then interpolated for
each fragment intersecting the primitive. This is the vertex shader:

```glsl
#version 120

attribute vec3 normalIn; // <- passed from the host

varying vec3 normal; // <-- outputted

void main() {
    // pass on a 4D vector consisting of our 2D position, at z=0,
    //  and with canonical homogeneous coords.
    gl_Position = vec4(gl_Vertex.xy, 0, 1);
    // pass on texCoords as is.
    gl_TexCoord[0] = gl_MultiTexCoord0;
    // pass on color as is.
    gl_FrontColor = gl_Color;
    // pass on normal vector to fragment shader:
    normal = normalIn;
}
```

And here is the fragment shader:

```glsl
#version 120

varying vec3 normal; // interpolated input from vertex shader

void main() {
    // add 1 to all components to ensure nonnegative, then normalize...
    gl_FragColor = vec4((normal + 1)/2, 1.0);
}
```

In general, in the fragment shader you may use `gl_FragCoord.xy` to get the $x, y$ positions, **in
window coordinates**, of the center of the pixel the fragment is situated in.

#### Uniforms

Uniforms are read-only variables which are shared across all threads. See the [SFML tutorial](https://www.sfml-dev.org/tutorials/3.0/graphics/shader/#loading-shaders) 
to see how to set these from the CPU side in SFML. In GLSL, these look like e.g.:

```glsl
uniform vec2 windowSize;
uniform sampler2D texture;
```

The latter is a `sampler2D`, which binds to a texture and allows for sampling via the `texture2D` function:

```glsl
// returns a vec4 corresponding to sampled rgba at vec_2_coords, which is in [0, 1]^2 UV coords.
texture2D(texture, vec_2_coords);
```

Textures can be configured to have interpolation or nearest neighbour sampling setup, and in raw OpenGL can be
configured to have different sampling behaviours when you go off the edge. In SFML this edge behaviour is not
*fully* [+note4] configurable, and the default behaviour is to clamp to the closest valid pixel.
Sampling can be configured via `sf::Texture`'s `setSmooth` method, which defaults to `false` (corresponding to
nearest neighbour sampling).

## Problems

In these problems we will work directly with OpenGL shaders. That means that the vertex shader is expected to
return (3D + 1 homogeneous coordinate) points in clip space — in OpenGL convention, that means +x is right, +y
is up, and +z points directly at you. Furthermore, texture coordinates in OpenGL are **normalized**, with the
origin at the bottom-left and the point $(1, 1)$ at the top-right of the texture.

1.  *Hello shader*. You are given a “fullscreen triangle” in clip-space, which has corners in counter-clockwise order:

    1.  $(-1, -1, 0, 1)$ bottom-left
    2.  $(3, -1, 0, 1)$ bottom-right
    3.  $(-1, 3, 0, 1)$ top-left

    (we automatically append the last two dimensions in the vertex shader described below). The
    w-coordinate of 1 ensures that after perspective division, we have 3D NDC coordinates which keep
    $x, y, z$ the same. Remember that NDC is in $[-1, 1]^3$, so the bottom-right and top-left
    corners of the triangle actually extend beyond the screen. These corners have corresponding UV
    coordinates:

    1.  $(0, 0)$ bottom-left
    2.  $(2, 0)$ bottom-right
    3.  $(0, 2)$ top-left

    You can easily verify that with these UV coordinates, the NDC point $(1, 1, 0)$ corresponding to
    the top-right of the screen has UV coordinates $(1, 1)$, and similarly bottom-right NDC
    $(1, -1, 0)$ has UV coords $(1, 0)$ and the top-left NDC $(-1, 1, 0)$ has UV coords
    $(0, 1)$.

    A fullscreen triangle like this is preferable over a fullscreen quad (consisting of two triangles) for
    rendering 2D overlays, because the diagonal along which the two triangles touch invoke the fragment
    shader twice (once for each triangle). You can read more about this optimization
    [here](https://30fps.net/pages/twotris/).

    <ImageCard
      id="fig-1a"
      image="https://30fps.net/pages/twotris/clipspace.png"
      width="1280px"
      :center="true"
    />

    You are given a free vertex shader which forwards the default SFML `sf::Vertex` layout:

    ```glsl
    #version 120

    void main() {
        // pass on a 4D vector consisting of our 2D position, at z=0,
        //  and with canonical homogeneous coords.
        gl_Position = vec4(gl_Vertex.xy, 0, 1);
        // pass on texCoords as is.
        gl_TexCoord[0] = gl_MultiTexCoord0;
        // pass on color as is.
        gl_FrontColor = gl_Color;
    }
    ```

    In the above, SFML set the “inputs” `gl_Vertex`, `gl_MultiTexCoord0`, and `gl_Color` for us. Note that
    this shader implementation omits some of the magic that SFML does for us — for example, we omit
    automatically normalizing texture coordinates (so that SFML could represent them unnormalized on the
    CPU side), or flipping axis orientations (so that SFML could represent the origin at the top-left).
    Our assumption for this problem is that we are directly working in OpenGL's coordinates, and that
    that's how our points are represented on the CPU-side.

    The fragment shader can access `gl_TexCoord[0]` and `gl_FrontColor`. It cannot access `gl_Position`
    (which is treated as a special output of the vertex shader). However, each invocation of the fragment
    shader can access the specific pixel in window coordinates. In particular, it is a `vec4` whose x and
    y values are the window-coordinates **center** of the pixel the fragment corresponds to (note,
    $(0, 0)$ is the bottom-left of the window, $(\texttt{WINDOW\_WIDTH}, \texttt{WINDOW\_HEIGHT})$ is the top-right).

    Write a fragment shader which linearly interpolates the following color scheme for the 4 corners of
    the window:

    - Bottom-left: Black
    - Bottom-right: Red
    - Top-left: Green
    - Top-right: Yellow

    You may start off by hard-coding the window width/height in the fragment shader to get things working,
    but afterwards you should pass in the width and height dynamically as uniforms. As a reminder, you may
    use `gl_FragCoord.xy` to get the $x, y$ positions, **in window coordinates**, of the center
    of the pixel the fragment is situated in.

    *Note*: in GLSL, colours are conventionally `vec4`s — namely, 4 floats (RGBA) in $[0, 1]$ each.

    A solution to this problem will look like this:

    <ImageCard
      id="fig-1a"
      image="/static/img/lab10_prep.png"
      title="Problem 1a solution"
      width="1280px"
      :center="true"
    />

2.  *Shapes*. We can draw shapes represented analytically (precisely with vector math as opposed to
    polygonal approximations) using fragment shaders, in parallel on our GPUs. Add a new uniform variable
    corresponding to the position of your cursor to the fragment shader. Update this variable each frame.
    Finally, draw a circle of radius 10 surrounding the mouse position in the fragment shader. Make the
    colour of this circle white. Do not use `sf::Circle`, which is actually represented by triangles under
    the hood.

3.  *Animation*. Using `chrono`, keep track of the time since the program started (e.g., in milliseconds)
    and pass this as another uniform to the fragment shader. Do something cool with this data. For
    example, you can make the background cycle through a gradient of colours, or just cyclically translate
    the background horizontally over time.

4.  *Blur*. Inside `blur.frag`, write a fragment shader which takes a texture and blurs it with a box
    filter of width and height 5 pixels. This means that for each point, it averages all samples of the
    texture within a $5 \times 5$ pixel rectangle centered at the current point, and uses that average
    as the output for the fragment. You will need `gl_TexCoord[0].xy` to get the $(x, y)$ uv-coords
    of the current fragment (which is automatically interpolated for you between the fullscreen triangle's
    corners), and you will also need to remember that UV-coordinates are expressed in $[0, 1]^2$.

    To test this code, you will need to modify your original code to instead render with the original
    fragment shader into a `sf::RenderTexture` (instead of the `sf::RenderWindow`). Then, you will need to
    post-process render with the blurring fragment shader into the `sf::RenderWindow`. You can call
    `setUniform` with a `sf::RenderTexture` like so:

    ```cpp
    postProcessShader.setUniform("texture", preBlurRenderTexture.getTexture());
    ```

[+note1]: Latency as in the duration of time between being instructed to do a particular operation and its completion of
  that operation.

[+note2]: For simplicity, this is ignoring SIMD, as well as the expected gains from hyper-threading (Intel)/simultaneous
  multi-threading (AMD).

[+note3]: I.e., the language you program the GPU in.

[+note4]: See [here](https://github.com/SFML/SFML/issues/1837).
