> iOS启动速度优化，APP启动大体分为两个阶段：`pre_main`和`post_man` 具体参考[APP启动速度优化](https://www.baidu.com),本篇主要讨论一种 优化pre_main函数调用延后的方案。


#### 项目中哪些方法会在pre_main执行
- All +load methods
- All C++ static initializers
- All C/C++ attribute(constructor) functions

#### 上述pre_main调用方法使用场景
- 路由注册 +load处理
- 一些三方库（C/C++）初始化
- Method Swizzing方法交叉处理
- 

#### 发现了一些问题

- 单个的+load方法耗时1~3ms（粗略 可能受到设备系统内存等等影响）
- 调用UIKit相关方法会导致部分类提早初始化
![12345](https://wiki.zhiyinlou.com/download/attachments/83035790/image2020-8-13_16-12-20.png?version=1&modificationDate=1597306341000&api=v2)
- 主线程执行，完全阻塞式执行

#### 如何解决  
用到了一个技术：
__attribute__ used section
更多 请参考：
[__attribute__详解及应用](https://www.jianshu.com/p/965f6f903114)和
[__attribute__ 总结](https://www.jianshu.com/p/29eb7b5c8b2d)

> 实现原理简述：Clang 提供了很多的编译器函数，它们可以完成不同的功能。其中一种就是 section() 函数，section()函数提供了二进制段的读写能力，它可以将一些编译期就可以确定的常量写入数据段。 在具体的实现中，主要分为编译期和运行时两个部分。在编译期，编译器会将标记了 attribute((section())) 的数据写到指定的数据段中，例如写一个{key(key代表不同的启动阶段), *pointer}对到数据段。到运行时，在合适的时间节点，在根据key读取出函数指针，完成函数的调用。

##### 参考案例1  美团 Kylin  管理启动项


```
KLN_STRINGS_EXPORT(“Key”, “Value”)

__attribute__((used, section("__DATA" "," "__kylin__"))) static const KLN_DATA __kylin__0 = (KLN_DATA){(KLN_DATA_HEADER){"Key", KLN_STRING, KLN_IS_ARRAY}, "Value"};


```


```
KLN_FUNCTIONS_EXPORT(STAGE_KEY_A)() { // 在a.m文件中，通过注册宏，把启动项A声明为在STAGE_KEY_A阶段执行
    // 启动项代码A
}
```

```
KLN_FUNCTIONS_EXPORT(STAGE_KEY_A)() { // 在b.m文件中，把启动项B声明为在STAGE_KEY_A阶段执行
    // 启动项代码B
}
```

在启动流程中，在启动阶段STAGE_KEY_A触发所有注册到STAGE_KEY_A时间节点的启动项，通过对这种方式，几乎没有任何额外的辅助代码，我们用一种很简洁的方式完成了启动项的自注册。


```
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // 其他逻辑
    [[KLNKylin sharedInstance] executeArrayForKey:STAGE_KEY_A];  // 在此触发所有注册到STAGE_KEY_A时间节点的启动项
    // 其他逻辑
    return YES;
}
```
更多详情请参考 ：[美团外卖iOS App冷启动治理](https://tech.meituan.com/2018/12/06/waimai-ios-optimizing-startup.html)

##### 参考案例2   BeeHive  路由注册： 静态plist，动态注册，annotation
首先把数据放在可执行文件的自定义数据段


```
// 通过BeeHiveMod宏进行Annotation标记

#ifndef BeehiveModSectName

#define BeehiveModSectName "BeehiveMods"

#endif

#ifndef BeehiveServiceSectName

#define BeehiveServiceSectName "BeehiveServices"

#endif


#define BeeHiveDATA(sectname) __attribute((used, section("__DATA,"#sectname" ")))


// 这里我们就把数据存在data数据段里面的"BeehiveMods"段中
#define BeeHiveMod(name) \
class BeeHive; char * k##name##_mod BeeHiveDATA(BeehiveMods) = ""#name"";


#define BeeHiveService(servicename,impl) \
class BeeHive; char * k##servicename##_service BeeHiveDATA(BeehiveServices) = "{ \""#servicename"\" : \""#impl"\"}";

@interface BHAnnotation : NSObject

@end
```

从Mach-O section中读取数据


```
NSArray<NSString *>* BHReadConfiguration(char *sectionName,const struct mach_header *mhp);
static void dyld_callback(const struct mach_header *mhp, intptr_t vmaddr_slide)
{
    NSArray *mods = BHReadConfiguration(BeehiveModSectName, mhp);
    for (NSString *modName in mods) {
        Class cls;
        if (modName) {
            cls = NSClassFromString(modName);
            
            if (cls) {
                [[BHModuleManager sharedManager] registerDynamicModule:cls];
            }
        }
    }
    
    //register services
    NSArray<NSString *> *services = BHReadConfiguration(BeehiveServiceSectName,mhp);
    for (NSString *map in services) {
        NSData *jsonData =  [map dataUsingEncoding:NSUTF8StringEncoding];
        NSError *error = nil;
        id json = [NSJSONSerialization JSONObjectWithData:jsonData options:0 error:&error];
        if (!error) {
            if ([json isKindOfClass:[NSDictionary class]] && [json allKeys].count) {
                
                NSString *protocol = [json allKeys][0];
                NSString *clsName  = [json allValues][0];
                
                if (protocol && clsName) {
                    [[BHServiceManager sharedManager] registerService:NSProtocolFromString(protocol) implClass:NSClassFromString(clsName)];
                }
                
            }
        }
    }
    
}
__attribute__((constructor))
void initProphet() {
    _dyld_register_func_for_add_image(dyld_callback);
}

NSArray<NSString *>* BHReadConfiguration(char *sectionName,const struct mach_header *mhp)
{
    NSMutableArray *configs = [NSMutableArray array];
    unsigned long size = 0;
#ifndef __LP64__
    uintptr_t *memory = (uintptr_t*)getsectiondata(mhp, SEG_DATA, sectionName, &size);
#else
    const struct mach_header_64 *mhp64 = (const struct mach_header_64 *)mhp;
    uintptr_t *memory = (uintptr_t*)getsectiondata(mhp64, SEG_DATA, sectionName, &size);
#endif
    
    unsigned long counter = size/sizeof(void*);
    for(int idx = 0; idx < counter; ++idx){
        char *string = (char*)memory[idx];
        NSString *str = [NSString stringWithUTF8String:string];
        if(!str)continue;
        
        BHLog(@"config = %@", str);
        if(str) [configs addObject:str];
    }
    
    return configs;

    
}

@implementation BHAnnotation

@end
```

__attribute__((constructor))就是保证在main之前读取所有注册信息。

使用

```
@BeeHiveMod(ShopModule)
@interface ShopModule() <BHModuleProtocol>

@end
@implementation ShopModule
```


#### 解决方案
把+load等main函数之前的代码移植到了main函数之后
> 原理是把函数地址放到DATA段中，然后主程序在启动时获取DATA的内容，并逐个调用。

// 设置成宏方便使用

```
typedef void (*AppLaunchFuncCallback)(void);
typedef void (*AppLaunchFuncTemplate)(AppLaunchFuncCallback);

#define K_STRING_DATASectionName "__strstore"
#define K_FUNCTION_DATASectionName "__funcstore"
#define K_SegmentName  "__DATA"

#define K_DATA(sectname) __attribute((used, section("__DATA,"#sectname" ")))
#define K_PYFUNCTION_DATA __attribute((used, section(K_SegmentName "," K_FUNCTION_DATASectionName )))



#define AppLaunchReLoadFunc(functionName)  \
static void AppLaunch##functionName(AppLaunchFuncCallback);\
static AppLaunchFuncTemplate varLoadable##functionName K_PYFUNCTION_DATA = AppLaunch##functionName;\
static void AppLaunch##functionName
```

读取所有注册信息

```

//static int LoadableFunctionCallbackImpl(const char *name){

static void LoadableRun(const char * segmentName,const char *sectionName){
    CFTimeInterval loadStart = CFAbsoluteTimeGetCurrent();
    
    Dl_info info;
    int ret = dladdr(LoadableRun, &info);
    if(ret == 0){
        // fatal error
    }
    
#ifndef __LP64__
    const struct mach_header *mhp = (struct mach_header*)info.dli_fbase;
    unsigned long size = 0;
    uint32_t *memory = (uint32_t*)getsectiondata(mhp, segmentName, sectionName, & size);
#else /* defined(__LP64__) */
    const struct mach_header_64 *mhp = (struct mach_header_64*)info.dli_fbase;
    unsigned long size = 0;
    uint64_t *memory = (uint64_t*)getsectiondata(mhp, segmentName, sectionName, & size);
#endif /* defined(__LP64__) */
    
    CFTimeInterval loadComplete = CFAbsoluteTimeGetCurrent();
    if(size == 0){
        NSLog(@"QWLoadable:empty");
        return;
    }
    
    for(int idx = 0; idx < size/sizeof(void*); ++idx){
        AppLaunchFuncCallback func = (AppLaunchFuncCallback)memory[idx];
        func();
    }
    
}

@implementation AppLaunchManager
+ (void)run{
    LoadableRun(K_SegmentName,K_FUNCTION_DATASectionName);
}

@end
```

使用

```
@interface ViewController ()

@end

@implementation ViewController
//+ (void)load {
//    NSLog(@"123456");
//}

AppLaunchReLoadFunc(FooObjecttag9012)(){
    NSLog(@"123456");
}
- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after 
    
}
```


在main函数之后合适的时机进行调用
比如：RootViewController加载完成的时候

```
    [AppLaunchManager run];

```

目前暂时替换 +load路由注册的部分 （80+个）
从DATA段读取函数地址的耗时 几乎可以忽略

#### 写到最后
启动速度的优化都是毫秒级，这个也是一种优化pre_main耗时的途径。有好的办法也可以一起交流。






