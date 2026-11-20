# Lab 12 Prep Problems

Author: Daniel Zhang

> [!WARNING]
> Due: November 24th 2026, 2:00pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-12-prep"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Spatial acceleration structures

Suppose we have a set of geometric primitives (points, triangles, etc.). Nearly every application which deals
with such sets needs to be able to exploit the spatial structure of these primitives to speed up queries. For
example:

- *Spatial indexing*: assigning indices or ordering which exploits the spatial structure of data to allow for
  fast lookup.
- *Geometric intersection queries*: given a query object/geometry, which elements in the set intersect with
  it? Some example special cases:
    - *Range searching*: Given geometric subregion, report either a list or an aggregate statistic of the data
      points within it.
    - *Collision detection*: Given a query geometry, find the primitives in the set which intersect it.
        - *Ray-object intersection*: a special case used in raytracing, where rays are the query geometry to
          intersect with the scene.
    - *($k$-)nearest neighbour(s)*: Given a query point, find the ($k$) closest point(s)
      in the set to that point.

Note that you could always solve all of the above problems by brute force — simply iterate through the entire
dataset. However, for datasets of at least medium size, this is not practical. If you are performing multiple
queries on *the same* data (e.g., multiple collision checks per frame), or on data that changes relatively
slowly over time, it is worth doing pre-processing to minimize the query time.

Beyond the efficiency of answering the above queries, there are other considerations when selecting an
acceleration structure. In the context of game engines, here are some:

- *Efficiency of updating dynamic objects*: Suppose your data changes over time. What is the cost of updating
  spatial positions? If your acceleration structure imposes some order on the data, how much does it cost to
  re-order it after making updates?
- *(Re)build time complexity*: If you often need to create new queryable sets, or if the majority of your
  objects are dynamic (and simply updating all the objects is infeasible/inefficient), it may be more
  efficient to just rebuild the entire acceleration structure from scratch each frame. In these cases, the
  cost of building the acceleration structure is relevant.
- *Memory complexity for spatially sparse data*: What if the distribution of geometry in the world space is
  non-uniform? Does this cause excess wasted memory for empty regions? If your acceleration structure involves
  a tree, does it become imbalanced?
- *Cache efficiency*: Because we are making multiple queries per-frame and compute multiple frames per-second,
  the constant factors quickly accumulate. Remember that Big-$O$ analysis on data structures
  captures the growth of costs *relative to the number of elements*, and not necessarily relative to other
  factors.

### Non-hierarchical acceleration structures

For sufficiently simple/small and uniformly-distributed scenes, a grid can be sufficient as a spatial
acceleration structure.

#### Uniform grids

The most basic example of an acceleration structure is a uniform grid. Set some uniform grid cell size, and
then you can determine which cell a point belongs to by a division (and a truncation/rounding). Thus, finding
the bucket in which a point resides is $O(1)$. If your cells are an appropriate size such that you
can assume all objects are contained within the *size* of a cell, then to do collision checking on an object
you only need to check all the objects in the cells of your object cell's *Moore neighborhood* — the cell its *centroid*
belongs to as well as the 8 surrounding cells on the grid.

There are a few drawbacks to this approach:

- *Sensitivity to scale*: If an object is large enough to overlap many cells, you must waste memory storing it
  in each relevant cell. Consider insertion — for large objects, you must compute which cells it overlaps
  with, iterate over them, and insert a reference/ID to it in each one. Similarly for deletion.

  In **static scenes**, this is still workable — splice up your original geometry into sub-geometry which each
  fit into a single cell each. However, such an approach is clearly unwieldly for dynamic objects.

- *Difficulty of dynamic updates*: If an object occupies many cells and moves, you must find+remove it in
  those cells and update many new cells as it moves.

- *Memory-inefficient on spatially sparse data*: With a regular array implementation, each cell must have
  memory allocated for it. Even your objects only actually exist in a few cells, memory usage scales with the
  spatial bounds of your scene, not the actual object data.

- *Bounded region*: Because of the above point, you must determine a maximum region to create cells for (and a
  granularity of the grid) to remain within memory limits.

Grids are a form of *spatial partitioning* — this means that the underlying space in which objects exist is
divided into non-overlapping regions, as opposed to grouping/partitioning the constituent geometry of objects
themselves. The essential difference here is that BVH nodes are allowed to overlap in their node regions.

#### Spatial hashing

Spatial hashing resolves the issue of memory-efficiency in uniform grids. Assign each cell a hash value.
Instead of an array to store cell information, use a hash table which only stores data for occupied cells. The
hash table should use the cell's true 2-dimensional key as an ID (to resolve hash collisions), and a 2D Morton
code (recall Q2 in Lab 4's [exercise](../4/exercise.md)) is customarily used as the hash value.

Now, each cell costs more memory to store (accounting for storage of the key, hash table load factor
maintenance, etc.), and lookup is more expensive (though it is still $O(1)$ amortized w.r.t. the
number of objects) as it involves a hash and a bucket-traversal (for separate chaining) or probe (for open
addressing). In exchange, arbitrary geometric points can be stored, and memory usage goes up with the number
of objects as opposed to the total spatial bounds of the scene.

### Hierarchical acceleration structures

All spatial acceleration structures can be viewed as mechanisms which organize/order data points in a way that
allow for queries to quickly prune portions of the searched dataset. Even the most trivial acceleration
structure — a simple list (which you've been using until now) can be viewed this way. Consider the problem of
checking which objects in the list a query object intersects with. The naive implementation is to iterate
through each item in the list, and at each step doing a fine-grained collision check with the given object.

Thus, each iteration of the loop removes a constant number (just one) of elements to check. Even if you had a
scheme to eliminate two or three, or generally $k$, items at a time, the time it takes to check
against entire list is still $\frac{n}{k} \in \Theta(n)$ for constant $k$. Then to perform all pairwise
collision checks in a list is that $n$ times, or $\Theta(n^2)$.

Grids *can* lead to significant practical savings, but in terms of theoretical guarantees there are degenerate
cases which lead to the same $\Theta(n^2)$ bound (or worse). If the grid cells are too large, all objects
end up in the same cell which degenerates back to a single list. On the other hand, if the grid cells are too
small, each object ends up overlapping many cells. In this case, *even if your query geometry intersected
nothing in the scene*, you'd still have to iterate through each of the cells your query geometry overlaps
with. Clearly, you could make the grid arbitrarily more granular to make this cost increase arbitrarily high.

**The first insight** you should take away from this is that we need a partitioning scheme *that can adapt to
the spatial density of the scene*. We need a partition in which each subset/cell does not have too many points (avoiding
the degeneration into a list) and in which each subset/cell does not have too few points (avoiding
excess empty/redundant “cells”). In other words, we want roughly a constant number of objects within each
active cell.

**The second insight** to take away is that we need a way of organizing these subsets so that we can remove at
least a constant proportion of them at each step, as opposed to one-at-a-time. If you can remove *at least*
some constant proportion $p \in (0, 1)$ of the primitives at each step, then the number of remaining
primitives at each step goes down like $n, n(1-p), n(1-p)^2, \dots, n(1-p)^k$ at the $k$<sup>th</sup> iteration. Then to
get $< 1$ items remaining,

$$
\begin{align*}
n(1 - p)^k &< 1 \\
\implies (1 - p)^k &< n^{-1} \\
\implies k &> -\log_{1 - p}(n) && \text{(A log with base less than 1 is decreasing)} \\
&= - \frac{\log_{\frac{1}{1-p}}(n)}{\log_{\frac{1}{1-p}}(1-p)} && \text{(Change of base formula)} \\
&= - \frac{\log_{\frac{1}{1-p}}(n)}{-1} \\
&= \log_{\frac{1}{1-p}}(n)
\end{align*}
$$

Where you should note the final logarithm base $\frac{1}{1-p} > 1$. We can write off the final remaining element
as constant work. Hence, if you can prune at least a constant proportion of elements at each iteration, you
can complete each individual query in $O(\log(n))$ time, and trivially using each element in the set as a
query geometry means we can do all-pairs collision detection in $O(n\log n)$.

Spatial acceleration structures which (try to) combine these two insights are called *hierarchical
acceleration structures*. Such structures are represented as trees (hierarchies), whose leaf nodes typically
have some constant upper bound on the number of primitives they can each store. Once the limit is passed for a
given leaf node, it is split according to some criteria. Ideally, this split maintains a roughly fair split
between its subtrees, but some hierarchical acceleration structures depend on the distribution of data to
maintain this.

#### Spatial partitions (Quadtrees)

The first class of hierarchical acceleration structures are spatial partitions. Such structures partition and
subdivide the underlying world space into (almost [+note1]) disjoint regions, such that each region
ideally contains roughly the same number of primitives. There are many structures which achieve this —
$k$-d trees (generalized BSTs) which are themselves a special case of binary space partitioning (BSP) trees, as well as
quadtrees (octrees in 3 dimensions). While $k$-d trees are excellent for
static geometry, rebalancing them after updates and deletions can lead to significant changes in their
structure and hence rebalancing costs because their splits depend on analyzing the data points. For this
reason, this tutorial will focus on quadtrees for hierarchical spatial partitions.

Quadtrees are a 2D hierarchical spatial partition which are parameterized by (1) an overall AABB denoting the
region to subdivide and (2) a limit/capacity on the number of primitives that can be stored in the leaf nodes.
Basically, they work as follows:

1. We begin with a single large “cell” corresponding to the total region.
2. Elements are inserted into this cell until the capacity of elements per node are exceeded.
3. At this point, the cell is split/partitioned as if by a $2 \times 2$ grid into 4 equally sized
   sub-regions, whose disjoint union makes up the original region. These 4 new subregions become children of
   the current node, and the elements originally belonging to the current node get moved into the child which
   contains the respective element's centroid.
4. This proceeds recursively — at each insertion, traverse down repeatedly into the child node whose
   subregion fully contains our bounds until (a) we hit a leaf node, or (b) no child node fully contains us (i.e., we
   straddle the grid). In either case, we are then inserted into the primitives list of the node we
   landed on. If we hit a leaf node, check if we exceeded maximum primitive capacity per node. If so, split
   this node with 4 new children and relocate all non-straddling primitives into the appropriate child.

<ImageCard
  image="/static/img/quadtree-partition.svg"
  title="Quadtree partition"
  description="The root and its bottom-left child have each been split into four quadrants."
  width="280"
  :center="true"
/>

The description so far works great for points, but what about objects which have area? Even if a child cell
contains the centroid of an object, its area might overlap into another cell (we call this “straddling the
grid”). How to handle this is an implementation choice. Here are a few of the most common:

1. Internal nodes can be allowed to *also* store a list of elements. Then, elements are always placed into
   the element list of the **deepest node which fully contains them**.
2. “Loose quadtrees” expand on the above idea by allowing the cell bounds to slightly overlap. Each cell is
   expanded, e.g., by 50% of their original width in each of the four cardinal directions. Thus, objects
   which e.g. overlap with the origin are no longer forced to stay at the root — instead they can be pushed
   down to a level corresponding to their size. Also note that in this case, child nodes no longer fully make
   up their parent node.
3. Instead, a copy of the object ID can be placed in *all leaf nodes whose region overlaps with the object*.
   This presents difficulty with deletions and updates, because then you need a reverse mapping for each
   objectID enumerating pointers to all of the node element lists the object exists in.

For dynamic objects, we may also wish to be able to delete elements. Assuming we go with either option a.
above, a naive implementation can search which quadtree node element is stored at (as if we were inserting
it), search its primitives list, and then remove it from the list. However, accounting for straddling objects,
the primitives list could be unbounded. An optimized implementation would have a backwards mapping from
primitive/object ID to, roughly, the node and position in the node's primitive list where primitive ID is
stored.

Finally, geometric intersection queries can be made by intersecting with the AABBs of the 4 children cells at
the root, and recursing only into the subtrees where there was overlap. Assuming the points are close to
uniformly distributed, each subtree will have, on average, the same number of primitives as the others, hence
an average logarithmic query time.

##### Linear quadtrees (via hashing)

Note that each node in a quadtree corresponds to a 2D morton code (again recall Q2 in Lab 4's [exercise](../4/exercise.md)). 
At each level, we have two binary decisions when going into a child node: top/bottom and then left/right. Using SFML's 
coordinates (to be consistent with the problems), we can say the top-left quadrant is 00, the top-right quadrant is 01, 
the bottom-left is 10, and the bottom-right is 11. Notice that this representation factorizes: the more significant 
(left) bit indicates top/bottom and the less significant (right) bit indicates left/right.

<ImageCard
  image="/static/img/quadtree-morton.svg"
  title="Morton codes for the quadtree cells"
  width="280"
  :center="true"
/>

Then we can just repeatedly concatenate a sequence of 2 bits each to obtain a morton code corresponding to our
path along a quadtree. 1011 would indicate first going to the bottom-left of the root, then going to the
bottom-right child of that node. 0001 would indicate the top-right of the top-left of the root. Notice that
there is an issue of leading zeros — how to distinguish between 0001 and 01? It suffices to set a single
leading bit after which to read, e.g., 0001 is represented with 10001 and 01 is represented with 101.

The morton code allows us to obtain a hash for nodes in the tree — thus, at the cost of just storing the true
position + level somewhere in each quadtree node, we can store nodes as a hash table instead of a tree,
allowing for $O(1)$ access!

In practice, there are still some implementation details to work out — for example, if internal nodes store
straddlers, it is still necessary to at least probe intermediate nodes along a path. However, with some work
it is possible to save on storage by using metadata to remove explicitly storing intermediate nodes of degree
2 (i.e. just connecting a parent and child). Such quadtree representations are known as *compressed quadtrees*.

#### Object hierarchies (Bounding volume hierarchies)

An issue with partitioning space is that it is extremely sensitive to object movements within the space.
Quadtrees can have completely different structure after just minor translations of the objects in the scene.
Bounding volume hierarchies (BVHs) solve this problem by partitioning *the objects themselves* into groups.

<ImageCard
  image="/static/img/bvh.svg"
  width="50%"
  :center="true"
/>

A bounding volume hierarchy over three objects. Objects are grouped by proximity. These small groups are then
themselves grouped by proximity, with this process repeating until a single root node has an AABB enclosing
all objects. [+note2]

A node in a BVH is defined by its bounding volume and its two child nodes. The bounds of an BVH node is
defined recursively as:

- *Base case*: the bounding volume enclosing all primitives stored at the node, if the node is a leaf node.
- *Recursive case*: the bounding volume enclosing the bounding volumes of its two children, if the node is an
  internal node.

Any volume which is cheap to intersect and union can be used. For this lab, we will use AABBs as the bounding
volumes.

A BVH can be constructed either top-down or bottom-up. A top-down construction involves taking a bag of
objects, and partitioning them into two smaller “bags”, which then become two child BVH nodes. Ideally, these
two partitions are chosen such that the overlap between their bounding volumes is minimal. This is then
repeated recursively at each child node until the bag of objects associated with a node has a sufficiently
small number of objects left. At this point, the remaining objects at the node are just grouped together as a
leaf node.

On the other hand, a bottom-up construction involves finding micro-clusters of objects in the scene to group
together, forming a large number of small bags. These are the leaf nodes. These are then similarly grouped up
into larger groups, which form the height-1 internal nodes. Recursively, these groups can be repeatedly
grouped together until a single node remains.

Practically, top-down BVH construction allows for partitioning decisions to account for global-scale features
of your scene layout. This means that top-down construction methods generally produce higher-quality trees —
they can be constructed to best minimize the expected number of nodes you'll need to visit to evaluate an
intersection with a query object. However, top-down methods can be more expensive. They are also not easily
parallelizable — splitting a node requires that the node exists in the first place, meaning that child nodes
must wait for their ancestors to finish splitting first. Because tree levels from the root down have 1, 2, 4,
etc. nodes, it takes a while before you have significantly many nodes to process at the same time.

On the other hand, bottom-up methods are parallelizable, because you begin with all $n$ nodes to
group in parallel, then $n/2$, and so on. These methods are less trivial to implement efficiently (an $O(n)$
construction with *linear BVHs* using parallel radix sort is possible), and are hence out
of scope for this lab.

In general, there is a tradeoff to be made between quality of BVH construction and speed of construction.
Modern 3D engines (in fact, graphics APIs themselves) typically split scenes into two levels of BVHs — a
“top-level acceleration structure” (TLAS) and multiple “bottom-level acceleration structures” (BLAS).
Bottom-level acceleration structures are high-quality BVHs built slowly for known object meshes, which can
then be easily instantiated as primitives in the TLAS, a lower quality BVH which can be built each frame for
the entire scene.

##### The surface area heuristic

In this lab, we will focus on top-down BVH construction. The key question is: given a bag of objects, how do
you split them into two groups in a way that produces a high-quality tree? Even more verbosely, what split
will assign roughly half of the objects into each group, while also minimizing the number of times we'll have
to go down both subtrees when doing an intersection?

What makes a *bad* BVH? A BVH is bad when sibling subtrees consistently and greatly overlap with eachother.
Remember that the point of doing hierarchies is that by doing cheap bounding-volume intersection tests with a
single bounding volume representing a large proportion of the scene, we can prune that subsection of the scene
with a single intersection (if we don't intersect). That is, we want each intersection test to eliminate as
many primitives from the search as possible. If two sibling nodes in a BVH have large overlap, that means that
intersecting against one doesn't give you much information — chances are, if you intersect one, you will still
have to intersect the sibling AABB.

So, one obvious optimization is to only consider splits which spatially partition the centroids of each
subgroup of objects. A further simplification is to only consider axis-aligned splitting planes/lines. In
general, there are $\frac{1}{2}\sum_{k = 0}^{n} {n \choose k} = 2^{n-1}$ ways to partition a set into two. With these
simplifications, note that
there are at most $n-1$ axis-aligned splitting lines along each axis, so at most $2n-2$
candidate partitions.

We now have a feasible set of possible partitions to choose from. The surface area heuristic (SAH) cost gives
us an optimization objective to choose a partition, justified by the BVH's most common use case — ray tracing.

Suppose we have a bag of primitives to partition, $C$. At any step of top-down construction, we
could always give up and just make it a leaf node. To intersect a ray against all the objects in a leaf node
takes

$$
\sum_{i = 1}^{N} t_{\text{isect}}(i)
$$

time, where $N$ is the number of primitives in the node and $t_{\text{isect}}(i)$ is the time it takes
to intersect a ray against primitive $i$.

On the other hand, suppose we have a disjoint partition of our objects: $(A, B)$ such that
$A \sqcup B = C$. Then the cost of intersecting a ray against such a partition is:

$$
c(A, B) = t_{\text{trav}} + p_A \sum_{i = 1}^{N_A} t_{\text{isect}}(a_i) + p_B \sum_{i = 1}^{N_B} t_{\text{isect}}(b_i)
$$

where $t_{\text{trav}}$ is the time to traverse the interior node and determine which of the two child bounds
the ray intersects with, $p_A, p_B$ is the probability that the ray intersects with the bounds of
$A$ and $B$ respectively **given that this parent node has been intersected**,
$N_A$ and $N_B$ are the number of objects in each partition, and $a_i, b_i$ are
respectively indices of primitives in either subset.

The **surface area heuristic** estimates $p_A$ and $p_B$ according to the following fact
from geometric probability:

::: important

**Fact**. Suppose (in 3D) we have two **convex** closed surfaces $S$ and $S'$ such that
$S$ fully encloses $S'$. The probability that a random ray $r$ intersects
with the inner surface $S'$ **given that it intersects the outer surface** is exactly

$$
p(r \text{ intersects } S' | r \text{ intersects } S) = \frac{\text{area}(S')}{\text{area}(S)}
$$

:::

In particular, the surface area heuristic uses the surface area of the bounding volumes of $A$,
$B$ divided by the surface area of the bounding volume of $C$ to obtain
$p_A, p_B$:

$$
c(A, B) \approx t_{\text{trav}} + \frac{\text{area}(\text{bounds}(A))}{\text{area}(\text{bounds}(C))} \sum_{i = 1}^{N_A} t_{\text{isect}}(a_i) + \frac{\text{area}(\text{bounds}(B))}{\text{area}(\text{bounds}(C))} \sum_{i = 1}^{N_B} t_{\text{isect}}(b_i)
$$

$t_{\text{trav}}$ and $t_{\text{isect}}$ are hyperparameters. A typical assumption is to assume $t_{\text{isect}}$ is
constant for all primitives:

$$
c(A, B) \approx t_{\text{trav}} + \frac{\text{area}(\text{bounds}(A))}{\text{area}(\text{bounds}(C))} N_A \cdot t_{\text{isect}} + \frac{\text{area}(\text{bounds}(B))}{\text{area}(\text{bounds}(C))}N_B \cdot t_{\text{isect}}
$$

Typically, traversal time is considered much cheaper than intersection time.

::: important

**Note**. To be clear, “surface area” is used in the context of 3D and higher dimensions — the equivalent in
2D would be the length of the perimeter of a shape.

:::

We now have an algorithm to determine the partition at each node: compute the hypothetical leaf node cost as
well as the SAH cost for all candidate partitions. Then, greedily choose the minimum-cost choice at each step.

##### A time complexity analysis of SAH and optimizations

###### Naive (“full sweep”) SAH

At each node, we have $k$ primitives left. We then need to sort these primitives along both axes
$O(k \log k)$. We then need to check $O(k)$ possible partitions, for each side of each partitioning
we need to compute its bounding box in $O(k)$, and finally choose the minimum. Thus the work at a
node is $O(k \log k + k \cdot k) = O(k^2)$. At the root this is $O(n^2)$, then the next level
down $O(\frac{n^2}{4} + \frac{n^2}{4}), ..., O(2^l \cdot \left(\frac{n}{2^l}\right)^2), ..., O(n)$ at the
leaves. Note $2^l \cdot \left(\frac{n}{2^l}\right)^2 = \frac{n^2}{2^l}$, and hence the total work
is $\sum_{l = 0}^{\log_2(n)} \frac{n^2}{2^l} \leq n^2 \sum_{l = 0}^{\infty} \frac{1}{2^l} = 2n^2 \in O(n^2)$.

###### Presorting

We actually only need to sort the object centroids along each axis once, and from there we can always filter
items from this sorted list without resorting. In this case we pay $O(n\log n)$ upfront, but at each node
we still pay $O(k^2)$ to do the partition bounding box calculations as before. So time complexity
remains the same, with a reduction in constant factors.

###### Intelligently computing prefix/suffix bounds

Given a sorted list of bounds (along an axis), we can compute the bounding boxes of all prefixes and suffixes
of objects in the list in $O(k)$. Store an array/vector of $k + 1$ AABBs. The value at index
$0$ is just the empty AABB, and from then on the value at index $i$ is the union of
the AABB at index $i - 1$ together with the AABB of the element at index $i - 1$ in the sorted
primitives. This stores all AABBs of prefix lists of objects. Similarly work backwards for the suffix AABBs.
Then, at each node we only do $O(k)$ work to compute all AABBs, and each of $O(k)$ partition
choices can index in the array of AABBs in $O(1)$ each. Thus we do $O(k)$ work per node, and
$O(n)$ work per level. There are $\log(n)$ levels and a presort cost of $n\log(n)$, hence
total work is $O(n\log n)$.

###### Binned SAH

A final optimization is to not consider all $2n-2$ partitions, but instead, a constant number
$k$ (e.g., 32 or 64 is usually good enough) of (spatially) uniformly distributed partitions along
each axis at each node split (i.e., $2k$ splits total) between the most extreme centroids. This
does not improve the time complexity, but it significantly reduces the constant factors. The tradeoff is that
the quality of the BVH degrades as you decrease the number of bins — thus your bin count acts as a tunable
tradeoff parameter between quality and time to construct.

##### BVH refitting

What if you have moving primitives? BVHs do not have to be fully rebuilt to remain valid — the only property
we require is that all ancestor nodes must have bounds which fully contain the bounds of their descendant
nodes, and the leaf node bounds must fully contain their primitives.

Suppose a single primitive moves out of its original leaf node bounds stored in the BVH. A BVH can be *refit*
by updating the corresponding leaf node AABB, then updating the bounds of the parent internal node to be the
union of the updated leaf node bound (and its other child bound). This is repeated for every ancestor up to
the root node, and clearly takes $O(\log n)$ time for a balanced tree. The upshot is that the BVH is now
once again valid for the scene.

What about if the entire scene updates? BVHs are typically stored in a compact linear array, where parent
nodes are always at lower indices than child nodes (this implies the root is at index 0). Hence, a full refit
can be performed in $O(n)$ by traversing backwards over the array, at each step refitting the node
to its new child bounds (which are guaranteed to already be processed).

However, too many refits will degrade the BVH quality. Suppose a primitive from one subtree moves so
drastically that it is in the center of the sibling subtree — in this case the refit will cause the two
siblings to overlap greatly. Thus, if you can make assumptions on the maximum movement of objects per frame,
you can estimate a level of degradation before a full rebuild is required.

##### Summary points on BVHs

- Nodes are based on object groups and may overlap, which removes the need in spatial acceleration structures
  to store duplicate references to objects when they cover multiple cells.
- BVHs trivially handle sparse and otherwise non-uniform spatial density because they only need nodes where
  the objects exist.
- BVHs (or their subtrees) can be rebuilt, combined (by connecting them with a new common root node), and
  refitted, making them ideal for dynamic scenes.
- BVHs can be recursively used as the primitive elements of other BVHs, as in TLASs and BLASs.
- BVHs are transformable because they are not anchored to specific world-space regions. For ray-object
  intersection tests, the nodes themselves do not even have to be transformed — instead, the model
  $\rightarrow$ world transform can be inverted and applied to the ray itself.

## Problems

1. *Quadtree intersection queries*: Inside of `quadtree.h`, a partial implementation of a `QuadTree<T>` is
   provided to you. It has the following private fields:

   ```cpp
   AABB<float> mBounds;
   size_t mMaxPrimitivesPerLeaf;
   Registry<QuadTreeNode> mNodes; // 0 is always the root node
   Registry<T> mPrimitives;
   std::vector<AABB<float>>
       mPrimitiveBounds; // for the primitive at mPrimitives[i], mPrimitiveBounds[i] stores its
                           // AABB as it was when it was inserted.
   std::vector<uint32_t>
       mNextPrimitiveIdx; // for the primitive at mPrimitives[i], mNextPrimitiveIdx[i] stores the
                           // index of the next primitive in the primitive list of the containing
                           // node.
   std::vector<PrimToNode>
       mPrimToNode; // backwards mapping such that mPrimToNode[i] stores information on where
                       // primitive i is stored in the hierarchy.
   ```

   Where `mBounds` is the total space being partitioned by the quadtree, `mMaxPrimitivesPerLeaf` is the limit
   on primitives stored “in” a leaf node past which it must be split, `mPrimitives` is the storage for the
   geometry primitives, and three auxiliary mappings augmenting the primitives registry is as documented.

   This is the definition of the nodes in the quadtree:

   ```cpp
   struct QuadTreeNode {
       static constexpr uint32_t INVALID_IDX = std::numeric_limits<uint32_t>::max();

       constexpr bool isLeaf() const { return childIdx == INVALID_IDX; }

       uint32_t childIdx
           = INVALID_IDX; // first index to children QuadTree nodes. Our children are
                          // childIdx, childIdx + 1, childIdx + 2, childIdx + 3 (if valid)
       uint32_t primitivesIdx = INVALID_IDX; // first index to primitives linked list. If internal
                                             // node, this is a list of straddlers.
       uint32_t primitivesLen = 0; // number of primitives, cache to avoid pointer-chasing count
   };
   ```

   We've made a few design decisions here:

    - In the case that an inserted bound might straddle the 2-by-2 grid at some level, we always place it in
      the `primitives` list of the deepest internal node possible — namely, the first node (coming from the
      root) at which it straddles the grid.

    - Notice that quadtree nodes do not each store their own `std::vector<uint32_t>` for the primitive indices
      they “store”. Such a design was okay in our ECS because the number of registries of an ECS is bounded at
      compile-time and relatively small. However, the number of nodes in a quadtree can grow quite large —
      storing a vector (24 bytes) for each would mean that you could hardly fit two quad tree nodes on a
      single cache line (typically 64 bytes), after accounting for the other fields.

      Instead, each `QuadTreeNode` only stores the *first* index of its primitives, and the rest are linked
      via an implicit linked list using the single `mNextPrimitiveIdx` vector in the overall quadtree.

    - Similarly, we do not store all child node indices — we instead maintain an invariant that we will always
      allocate 4 consecutive quad tree nodes in `mNodes` if any child node is needed. Notably this means that
      some leaf nodes may be empty.

    - We choose `uint32_t`s as we do not expect to store over 4 billion entries in our quadtree. This allows
      us to halve the space needed for our indices.

    - We do not store the AABB which represents the region of this node — instead this is computed on-the-fly
      during traversal. This is a savings of 16 bytes per node.

    - `primitivesLen` is not strictly necessary, but we use it to avoid having to manually pointer-chase to
      determine when to split a node.

   These choices give us a lightweight node size of 12 bytes. However, because each `QuadTreeNode` is defined
   relative to the context of the storages in the `QuadTree`, an elegant recursive traversal is not as
   simple. For these problems, do not use recursion — instead, implement recursion by maintaining a stack of
   sufficient information whenever needed.

   First, copy and paste your `Registry` implementation in `registry.h`. Add a trivial method to it:

   ```cpp
   size_t containerSize() const { return mStorage.size(); }
   ```

   In `quadtree.h`, implement these two helper methods inside `QuadTree<T>`:

   ```cpp
   // aabbQueryQuadrant returns the quadrant that query should go into. If we cannot go any deeper
   // (i.e., query straddles the center lines of the current cell), return
   // OrdinalDirection::INVALID.
   // Precondition: query is not empty. You may assume a priori that currentCell is not empty.
   // Precondition: currentCell contains query.
   OrdinalDirection aabbQueryQuadrant(
       const AABB<float>& query, const AABB<float>& currentCell) const
   ```

   and

   ```cpp
   // modifies a given AABB to obtain the resulting AABB if we were entering the cell on its
   // "direction" quadrant
   // Precondition: direction is not INVALID
   void aabbEnter(AABB<float>& bounds, OrdinalDirection direction) const
   ```

   Finally, implement the method

   ```cpp
   // Appends primitive indicies whose bounds intersect with the given queryBounds to candidates.
   // Returns the number of intersection candidates found
   uint32_t queryIntersecting(const AABB<float>& queryBounds, std::vector<uint32_t>& candidates)
   ```

   For this last one, maintain a stack manually and use it to emulate recursion. We recommend maintaining at
   each stack frame a node index and the bounds represented by that node.

   Once you're done these problems, make a release build using

   ```bash
   cmake --preset release
   cmake --build release
   ```

   in the build folder. Two executables will be built which simulate elastic collisions between 5000 balls.
   Note the performance differences in the printed FPS. In particular, `quadtree_no_accel` should build
   without any work at all.

   <ImageCard
     image="/static/img/lab12prep.png"
     title="5000 colliding objects"
     width="80%"
     :center="true"
   />

2. In `written.txt`, consider the following problems:
    1. Suppose we have a quadtree partitioning the unit square, $[0, 1]^2$. Design an adversarial
       sequence of points which, when inserted, will maximally unbalance the tree — i.e., such that it
       degenerates into a list.

       Then, give an example of a geometry (a point is sufficient) inside $[0, 1]^2$ which, when
       queried for intersection with these points, can complete in constant time. Give another example of a
       geometry/point, which when queried for intersections, will take $O(n)$ time to complete
       given your adversarial set of points.

    2. Suppose the maximum number of primitives at a leaf node is, say, 8. What happens if you repeatedly
       insert the exact same point into a quad tree? If this is a problem, how can you alleviate it?

    3. A desirable feature of acceleration structures in dynamic scenes is the ability to transform the scene
       and to cheaply adapt the structure to the new scene. For example, translating all objects over by an
       amount, or rotating the entire scene by 13 degrees around the x-axis. Discuss how such transformations
       would affect the structure of a quadtree containing all scene objects. Make some conclusion about what
       quadtrees are well-suited for and what they are not.

[+note1]: For sanity of implementation we allow overlap regions of measure 0, in particular at the edges of cells.

[+note2]: Credit to [Pharr et al.](https://www.pbr-book.org/3ed-2018/Primitives_and_Intersection_Acceleration/Bounding_Volume_Hierarchies)
