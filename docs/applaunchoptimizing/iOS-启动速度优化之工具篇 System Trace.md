什么是System Trace

简单点说就是记录一个App运行过程中所有底层系统线程、内存的调度使用过程的工具。 这个模板提供了系统行为的全面信息。它显示线程的调度、系统线程的转化和内存使用情况。这个模板可以使用在OS X或iOS中。 

锁的互斥，主要是主线程等子线程释放锁
线程优先级，抢占和高优线程超过CPU核心数量
虚拟内存，Page Fault的代价其实不小
系统调用，了解性能瓶系统正在做什么
System Trace的各个模块的使用方式

System Load

可以看到各个时刻的线程的状态。 以10ms为纬度，统计活跃的高优线程数量和CPU核心数对比，如果高于核心数量会显示成黄色，小于等于核心数量会是绿色。这个工具是用来帮助调试线程的优先级的： 线程的优先级可以通过QoS来指定，比如GCD在创建Queue的时候指定，NSOperationQueue通过属性指定： //GCD dispatch_queue_attr_t attr = dispatch_queue_attr_make_with_qos_class(DISPATCH_QUEUE_SERIAL, QOS_CLASS_UTILITY, - 1); dispatch_queue_tqueue = dispatch_queue_create( "com.custom.utility.queue", attr); //NSOperationQueue operationQueue .qualityOfService= NSQualityOfServiceUtility 选择合适的优先级，避免优先级反转，影响线程的执行效率，尤其是别让后台线程抢占主线程的时间。 

Thread State Trace

当你的程序运行的时候，实际上它依赖于CUP的运行。那么就不可避免的会产生CUP竞争和调度。这就依赖于操作系统的线程调用策略，来进行线程切换。在System Trace中，你可以清楚的看到每个线程中的细节调用过程。 几个线程状态说明：

Running，线程在CPU上运行
Blocked，线程被挂起，原因有很多，比如等待锁，sleep，File Backed Page In等等。
Runnable，线程处于可执行状态，等CPU空闲的时候，就可以运行
Interrupted，被打断，通常是因为一些系统事件，一般不需要关注
Preempted，被抢占，优先级更高的线程进入了Runnable状态


Blocked和Preempted是优化的时候需要比较关注的两个状态，分析的时候通常需要知道切换到这两个状态的原因，这时候要切换到Events: Thread State模式，然后查看状态切换的前一个和后一个事件，往往能找到状态切换的原因。 

除了Thread State Event比较有用，另外一个比较有用的是Narrative，这里会把所有的事件，包括下文的虚拟内存等按照时间轴的方式汇总



User Interactive Load Average (用户交互负载记录器)

User Interactive Load Average，就是跟踪每10毫秒内CUP的交互负载，并绘制成图像。



从上面的图片可以看出，蓝色线表示一个时刻，下面数据对应的时间点。下面的图表表示，在这一时刻你有3个线程正在Running或者Runnable。还可以知道每一个线程运行在哪个CUP上。 当然这样可能不直观，不知道到底我们的app行不行，那么苹果还提供一个直观的图表方便我们查看。 绿色部分表示，在这个时刻你的线程负载是CUP可以接受的。橙色部分表示，在这个时刻你的线程负载超出了CUP性能。

Point of Interest 查看感兴趣的点的统计信息

在instruments 8中，System Trace推出了Points of Interest这个功能，用来标记出我们关心的调用过程。

 kdebug也支持异步的处理。  需要注意的是要包含 #import <sys/kdebug_signpost.h> 在你关注的开始处添加kdebug_signpost_start(code,arg1,arg2,arg3,arg4) 在你关注的结束处添加kdebug_signpost_end(code,arg1,arg2,arg3,arg4)

code 用于区分不同Point的一个id。

arg1 预留字段

arg2 预留字段

arg3 预留字段

arg4 用于区分颜色， 0 Blue, 1 Green, 2 Purple, 3 Orange, 4 Red

颜色就是用于可以更好的标注你的兴趣点。例如你希望关注到网络请求的成功和失败两种情况，那么就可以这样。

Virtual Memory Trace

内存分为物理内存和虚拟内存，二者按照Page的方式进行映射。 可执行文件，也就是Mach-O本质上是通过mmap相关API映射到虚拟内存中的，这时候只分配了虚拟内存，并没有分配物理内存。如果访问一个虚拟内存地址，而物理内存中不存在的时候，会怎么样呢？会触发一个 File Backed Page In，分配物理内存，并把文件中的内容拷贝到物理内存里，如果在操作系统的物理内存里有缓存，则会触发一个 Page Cache Hit，后者是比较快的， 这也是热启动比冷启动快的原因之一。 这种刚刚读入没有被修改的页都是Clean Page，是可以在多个进程之间共享的。所以像__TEXT段这种只读的段，映射的都是Clearn Page。 _DATA段是可读写的，当_DATA段中的页没有被修改的时候，同样也可以在两个进程共享。但一个进程要写入，就会触发一次 Copy On Write，把页复制一份，重新分配物理内存。这样被写入的页称为Dirty Page，无法在进程之间共享。像全局变量这种初始值都是零的，对应的页在读入后会触发一次内存写入零的操作，称作 Zero Fill。 iOS不支持内存Swapping out即把内存交换到磁盘，但却支持内存压缩（ Compress memory），对应被压缩的内存访问的时候就需要解压缩（ Decompress memory），所以在Virtial Memroy Trace里偶尔能看到内存解压缩的耗时。



参考链接：

System Trace WWDC16

System Trace入坑笔记 - WWDC

性能深度分析之System Trace