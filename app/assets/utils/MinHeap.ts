export class MinHeap {
    data: { id: number; f: number }[] = [];

    push(id: number, f: number) {
        this.data.push({ id, f });
        this.bubbleUp(this.data.length - 1);
    }

    pop(): number | undefined {
        if (this.data.length === 0) return undefined;
        const top = this.data[0];
        const bottom = this.data.pop();
        if (this.data.length > 0 && bottom) {
            this.data[0] = bottom;
            this.bubbleDown(0);
        }
        return top?.id;
    }

    size() {
        return this.data.length;
    }

    private bubbleUp(index: number) {
        while (index > 0) {
            const parentIndex = (index - 1) >>> 1;
            if (this.data[index]!.f >= this.data[parentIndex]!.f) break;
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }

    private bubbleDown(index: number) {
        const lastIndex = this.data.length - 1;
        while (true) {
            const leftIndex = (index << 1) + 1;
            const rightIndex = leftIndex + 1;
            let swapIndex = index;

            if (
                leftIndex <= lastIndex &&
                this.data[leftIndex]!.f < this.data[swapIndex]!.f
            ) {
                swapIndex = leftIndex;
            }
            if (
                rightIndex <= lastIndex &&
                this.data[rightIndex]!.f < this.data[swapIndex]!.f
            ) {
                swapIndex = rightIndex;
            }
            if (swapIndex === index) break;
            this.swap(index, swapIndex);
            index = swapIndex;
        }
    }

    private swap(i1: number, i2: number) {
        const temp = this.data[i1]!;
        this.data[i1] = this.data[i2]!;
        this.data[i2] = temp;
    }
}
