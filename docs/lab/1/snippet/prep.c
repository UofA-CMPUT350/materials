#include <assert.h>
#include <stdlib.h>
#include <stdio.h>

typedef struct {
    int rows;   // number of rows
    int cols;   // number of columns
    double *a;  // pointer to rows*cols elements
} Matrix;

// initialize matrix pointed to by m with r rows and c columns
// i.e. allocate sufficient memory and set all elements to 0
void init(Matrix* m, int rows, int cols) {
    assert(rows > 0 && cols > 0);
    m->rows = rows;
    m->cols = cols;
    m->a = calloc((size_t)(rows * cols), sizeof(double));
}

// free memory associated with matrix pointed to by m
void deallocate(Matrix* m) {
    free(m->a);
    m->a = NULL;
    m->rows = 0;
    m->cols = 0;
}

// set the value of the element at (row, col) to the input value
void set(Matrix* m, int row, int col, double value) {
    assert(row >= 0 && row < m->rows && col >= 0 && col < m->cols);
    m->a[row * m->cols + col] = value;
}

// returns a pointer-to-const to the value of the element at (row, col)
const double* get(const Matrix* m, int row, int col) {
    assert(row >= 0 && row < m->rows && col >= 0 && col < m->cols);
    return &m->a[row * m->cols + col];
}

// print the value of the element at (row, col) to console with 2 decimal places
void print_cell(const Matrix* m, int row, int col) {
    printf("%.2f\n", *get(m, row, col));
}

// print the entire matrix in the following format with 2 decimal places
// i.e. 1.00 2.00 3.00
//      4.00 5.00 6.00
//      7.00 8.00 9.00
void print_matrix(const Matrix* m) {
    for (int row = 0; row < m->rows; ++row) {
        for (int col = 0; col < m->cols; ++col) {
            printf("%.2f%c", *get(m, row, col), col == m->cols - 1 ? '\n' : ' ');
        }
    }
}

int main(void)
{
    const int rows = 3;
    const int cols = 3;

    Matrix m = { 0 };
    init(&m, rows, cols);

    // Fill the matrix with values
    double value = 1.00;
    for (int i = 0; i < rows; ++i) {
        for (int j = 0; j < cols; ++j) {
            set(&m, i, j, value++);
        }
    }
    
    // Test your Matrix here
    // i.e. print_cell() and print_matrix()
    print_cell(&m, 1, 1);
    print_matrix(&m);

    deallocate(&m);
    return 0;
}
