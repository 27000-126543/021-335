import type { Template, ProjectType } from '../types';

const createId = () => Math.random().toString(36).substring(2, 9);

export const templates: Record<ProjectType, Template> = {
  '房建': {
    type: '房建',
    name: '房屋建筑工程组卷模板',
    description: '适用于住宅、商业、公共建筑等房屋建筑工程竣工资料组卷',
    volumes: [
      {
        name: '施工管理文件',
        description: '工程开工至竣工全过程的管理性文件',
        categories: [
          {
            name: '开工报审文件',
            documents: [
              { name: '工程开工报审表', required: true },
              { name: '开工报告', required: true },
              { name: '施工许可证', required: true },
              { name: '施工现场质量管理检查记录', required: true },
            ],
          },
          {
            name: '技术管理文件',
            documents: [
              { name: '施工组织设计报审表', required: true },
              { name: '施工组织设计', required: true },
              { name: '技术交底记录', required: true },
              { name: '图纸会审记录', required: true },
              { name: '设计变更通知单', required: true },
              { name: '工程洽商记录', required: true },
            ],
          },
          {
            name: '质量事故处理记录',
            documents: [
              { name: '质量事故报告', required: false },
              { name: '质量事故处理方案', required: false },
              { name: '质量事故处理记录', required: false },
            ],
          },
        ],
      },
      {
        name: '质量控制资料',
        description: '原材料、构配件、设备等质量证明文件及检验报告',
        categories: [
          {
            name: '建筑与结构',
            documents: [
              { name: '钢材出厂合格证及进场检验报告', required: true },
              { name: '钢筋连接试验报告', required: true },
              { name: '水泥出厂合格证及进场检验报告', required: true },
              { name: '砂、石进场检验报告', required: true },
              { name: '混凝土外加剂合格证及检验报告', required: true },
              { name: '粉煤灰合格证及检验报告', required: false },
              { name: '混凝土配合比通知单', required: true },
              { name: '混凝土强度试验报告', required: true },
              { name: '混凝土强度统计评定记录', required: true },
              { name: '砌筑砂浆配合比通知单', required: true },
              { name: '砂浆强度试验报告', required: true },
              { name: '砂浆强度统计评定记录', required: true },
              { name: '砖（砌块）出厂合格证及进场检验报告', required: true },
              { name: '防水材料合格证及进场检验报告', required: true },
              { name: '门窗合格证及性能检测报告', required: true },
              { name: '节能保温材料合格证及检验报告', required: true },
            ],
          },
          {
            name: '给排水与采暖',
            documents: [
              { name: '管材、管件出厂合格证', required: true },
              { name: '给水管道通水试验记录', required: true },
              { name: '排水管道灌水试验记录', required: true },
              { name: '卫生器具满水试验记录', required: true },
              { name: '采暖系统试压记录', required: true },
            ],
          },
          {
            name: '建筑电气',
            documents: [
              { name: '电气材料、设备出厂合格证', required: true },
              { name: '电气接地电阻测试记录', required: true },
              { name: '电气绝缘电阻测试记录', required: true },
              { name: '照明全负荷通电试运行记录', required: true },
              { name: '大型灯具牢固性试验记录', required: true },
            ],
          },
          {
            name: '通风与空调',
            documents: [
              { name: '通风空调材料设备合格证', required: true },
              { name: '通风系统试运行记录', required: true },
              { name: '空调系统调试记录', required: true },
              { name: '风管漏光、漏风检测记录', required: true },
            ],
          },
        ],
      },
      {
        name: '隐蔽验收记录',
        description: '各分项工程隐蔽验收记录',
        categories: [
          {
            name: '地基基础工程',
            documents: [
              { name: '土方开挖隐蔽验收记录', required: true },
              { name: '土方回填隐蔽验收记录', required: true },
              { name: '地基处理隐蔽验收记录', required: true },
              { name: '桩基础隐蔽验收记录', required: true },
              { name: '混凝土垫层隐蔽验收记录', required: true },
            ],
          },
          {
            name: '主体结构工程',
            documents: [
              { name: '钢筋工程隐蔽验收记录', required: true },
              { name: '预埋件隐蔽验收记录', required: true },
              { name: '钢结构隐蔽验收记录', required: false },
              { name: '墙体拉结筋隐蔽验收记录', required: true },
            ],
          },
          {
            name: '建筑装饰装修工程',
            documents: [
              { name: '抹灰基层隐蔽验收记录', required: true },
              { name: '门窗安装隐蔽验收记录', required: true },
              { name: '吊顶隐蔽验收记录', required: true },
              { name: '轻质隔墙隐蔽验收记录', required: false },
              { name: '饰面板（砖）隐蔽验收记录', required: true },
            ],
          },
          {
            name: '屋面工程',
            documents: [
              { name: '屋面找平层隐蔽验收记录', required: true },
              { name: '屋面保温层隐蔽验收记录', required: true },
              { name: '屋面防水层隐蔽验收记录', required: true },
              { name: '屋面细部构造隐蔽验收记录', required: true },
            ],
          },
          {
            name: '建筑节能工程',
            documents: [
              { name: '墙体节能隐蔽验收记录', required: true },
              { name: '门窗节能隐蔽验收记录', required: true },
              { name: '屋面节能隐蔽验收记录', required: true },
              { name: '地面节能隐蔽验收记录', required: true },
            ],
          },
          {
            name: '机电安装工程',
            documents: [
              { name: '给排水管道隐蔽验收记录', required: true },
              { name: '电气管线敷设隐蔽验收记录', required: true },
              { name: '通风空调风管隐蔽验收记录', required: true },
              { name: '消防管线隐蔽验收记录', required: true },
            ],
          },
        ],
      },
      {
        name: '竣工图',
        description: '各专业竣工图纸',
        categories: [
          {
            name: '建筑竣工图',
            documents: [
              { name: '建筑总平面图', required: true },
              { name: '建筑平面图', required: true },
              { name: '建筑立面图', required: true },
              { name: '建筑剖面图', required: true },
              { name: '建筑详图', required: true },
            ],
          },
          {
            name: '结构竣工图',
            documents: [
              { name: '基础平面图', required: true },
              { name: '基础详图', required: true },
              { name: '结构平面图', required: true },
              { name: '结构详图', required: true },
            ],
          },
          {
            name: '机电安装竣工图',
            documents: [
              { name: '给排水竣工图', required: true },
              { name: '电气竣工图', required: true },
              { name: '通风空调竣工图', required: true },
              { name: '消防竣工图', required: true },
            ],
          },
        ],
      },
      {
        name: '验收记录',
        description: '各分部、分项、检验批及竣工验收记录',
        categories: [
          {
            name: '分部工程验收',
            documents: [
              { name: '地基与基础分部工程验收记录', required: true },
              { name: '主体结构分部工程验收记录', required: true },
              { name: '建筑装饰装修分部工程验收记录', required: true },
              { name: '屋面工程分部工程验收记录', required: true },
              { name: '建筑给水排水及采暖分部工程验收记录', required: true },
              { name: '建筑电气分部工程验收记录', required: true },
              { name: '通风与空调分部工程验收记录', required: true },
              { name: '建筑节能分部工程验收记录', required: true },
            ],
          },
          {
            name: '竣工验收',
            documents: [
              { name: '单位工程质量竣工验收记录', required: true },
              { name: '单位工程质量控制资料核查记录', required: true },
              { name: '单位工程安全和功能检验资料核查及主要功能抽查记录', required: true },
              { name: '单位工程观感质量检查记录', required: true },
              { name: '工程竣工验收报告', required: true },
              { name: '工程竣工验收备案表', required: true },
            ],
          },
        ],
      },
    ],
  },
  '市政': {
    type: '市政',
    name: '市政基础设施工程组卷模板',
    description: '适用于道路、桥梁、管线等市政基础设施工程',
    volumes: [
      {
        name: '施工管理文件',
        description: '工程开工至竣工全过程的管理性文件',
        categories: [
          {
            name: '开工报审文件',
            documents: [
              { name: '工程开工报审表', required: true },
              { name: '开工报告', required: true },
              { name: '施工许可证', required: true },
              { name: '中标通知书', required: true },
              { name: '施工合同', required: true },
              { name: '施工现场质量管理检查记录', required: true },
            ],
          },
          {
            name: '技术管理文件',
            documents: [
              { name: '施工组织设计报审表', required: true },
              { name: '施工组织设计', required: true },
              { name: '专项施工方案', required: true },
              { name: '技术交底记录', required: true },
              { name: '图纸会审记录', required: true },
              { name: '设计变更通知单', required: true },
            ],
          },
        ],
      },
      {
        name: '质量控制资料',
        description: '原材料、构配件、设备等质量证明文件及检验报告',
        categories: [
          {
            name: '道路工程',
            documents: [
              { name: '钢材出厂合格证及检验报告', required: true },
              { name: '水泥出厂合格证及检验报告', required: true },
              { name: '沥青合格证及检验报告', required: true },
              { name: '集料试验报告', required: true },
              { name: '路基压实度检测报告', required: true },
              { name: '路面强度试验报告', required: true },
            ],
          },
          {
            name: '桥梁工程',
            documents: [
              { name: '钢筋合格证及试验报告', required: true },
              { name: '水泥合格证及试验报告', required: true },
              { name: '粗细集料试验报告', required: true },
              { name: '混凝土配合比', required: true },
              { name: '混凝土强度试验报告', required: true },
              { name: '预应力筋合格证及试验报告', required: false },
              { name: '锚夹具合格证及检验报告', required: false },
            ],
          },
          {
            name: '管线工程',
            documents: [
              { name: '管材合格证及检验报告', required: true },
              { name: '管道接口材料合格证', required: true },
              { name: '检查井材料合格证', required: true },
              { name: '管道严密性试验记录', required: true },
            ],
          },
        ],
      },
      {
        name: '隐蔽验收记录',
        description: '各分项工程隐蔽验收记录',
        categories: [
          {
            name: '道路工程隐蔽',
            documents: [
              { name: '路基隐蔽验收记录', required: true },
              { name: '基层隐蔽验收记录', required: true },
              { name: '面层隐蔽验收记录', required: true },
              { name: '附属构筑物隐蔽验收记录', required: true },
            ],
          },
          {
            name: '桥梁工程隐蔽',
            documents: [
              { name: '基础隐蔽验收记录', required: true },
              { name: '墩台隐蔽验收记录', required: true },
              { name: '钢筋工程隐蔽验收记录', required: true },
              { name: '预应力隐蔽验收记录', required: false },
            ],
          },
          {
            name: '管线工程隐蔽',
            documents: [
              { name: '沟槽开挖隐蔽验收记录', required: true },
              { name: '管道基础隐蔽验收记录', required: true },
              { name: '管道安装隐蔽验收记录', required: true },
              { name: '检查井隐蔽验收记录', required: true },
            ],
          },
        ],
      },
      {
        name: '竣工图',
        description: '各专业竣工图纸',
        categories: [
          {
            name: '道路工程竣工图',
            documents: [
              { name: '道路平面竣工图', required: true },
              { name: '道路纵断面竣工图', required: true },
              { name: '道路横断面竣工图', required: true },
              { name: '道路附属构筑物竣工图', required: true },
            ],
          },
          {
            name: '桥梁工程竣工图',
            documents: [
              { name: '桥梁平面竣工图', required: true },
              { name: '桥型布置竣工图', required: true },
              { name: '基础竣工图', required: true },
              { name: '下部结构竣工图', required: true },
              { name: '上部结构竣工图', required: true },
            ],
          },
          {
            name: '管线工程竣工图',
            documents: [
              { name: '管线平面竣工图', required: true },
              { name: '管线纵断面竣工图', required: true },
              { name: '附属设施竣工图', required: true },
            ],
          },
        ],
      },
      {
        name: '验收记录',
        description: '各分部、分项、检验批及竣工验收记录',
        categories: [
          {
            name: '分部工程验收',
            documents: [
              { name: '道路分部工程验收记录', required: true },
              { name: '桥梁分部工程验收记录', required: true },
              { name: '给排水分部工程验收记录', required: true },
              { name: '照明分部工程验收记录', required: true },
            ],
          },
          {
            name: '竣工验收',
            documents: [
              { name: '单位工程质量竣工验收记录', required: true },
              { name: '单位工程质量控制资料核查记录', required: true },
              { name: '单位工程安全和功能检验资料核查记录', required: true },
              { name: '单位工程观感质量检查记录', required: true },
              { name: '工程竣工验收报告', required: true },
              { name: '工程竣工验收备案表', required: true },
            ],
          },
        ],
      },
    ],
  },
  '装修': {
    type: '装修',
    name: '装饰装修工程组卷模板',
    description: '适用于新建、改建、扩建的建筑装饰装修工程',
    volumes: [
      {
        name: '施工管理文件',
        description: '工程开工至竣工全过程的管理性文件',
        categories: [
          {
            name: '开工报审文件',
            documents: [
              { name: '工程开工报审表', required: true },
              { name: '开工报告', required: true },
              { name: '施工现场质量管理检查记录', required: true },
              { name: '装修资质证明文件', required: true },
            ],
          },
          {
            name: '技术管理文件',
            documents: [
              { name: '施工组织设计报审表', required: true },
              { name: '施工组织设计', required: true },
              { name: '专项装修方案', required: true },
              { name: '技术交底记录', required: true },
              { name: '图纸会审记录', required: true },
              { name: '设计变更通知单', required: true },
              { name: '材料样板确认单', required: true },
            ],
          },
        ],
      },
      {
        name: '质量控制资料',
        description: '装修材料、构配件等质量证明文件及检验报告',
        categories: [
          {
            name: '抹灰工程',
            documents: [
              { name: '水泥合格证及检验报告', required: true },
              { name: '砂进场检验报告', required: true },
              { name: '外加剂合格证及检验报告', required: false },
            ],
          },
          {
            name: '门窗工程',
            documents: [
              { name: '门窗出厂合格证', required: true },
              { name: '门窗三性检测报告', required: true },
              { name: '玻璃合格证及检测报告', required: true },
              { name: '五金配件合格证', required: true },
              { name: '密封材料合格证', required: true },
            ],
          },
          {
            name: '吊顶工程',
            documents: [
              { name: '龙骨合格证及检验报告', required: true },
              { name: '吊顶板材合格证', required: true },
              { name: '防火涂料检验报告', required: true },
            ],
          },
          {
            name: '轻质隔墙工程',
            documents: [
              { name: '隔墙板材合格证', required: true },
              { name: '龙骨材料合格证', required: true },
              { name: '填充材料合格证', required: true },
            ],
          },
          {
            name: '饰面板（砖）工程',
            documents: [
              { name: '石材合格证及放射性检测报告', required: true },
              { name: '陶瓷砖合格证及检测报告', required: true },
              { name: '胶粘剂合格证及检验报告', required: true },
              { name: '填缝剂合格证', required: true },
            ],
          },
          {
            name: '涂饰工程',
            documents: [
              { name: '涂料出厂合格证及检测报告', required: true },
              { name: '腻子合格证', required: true },
              { name: '环保检测报告', required: true },
            ],
          },
          {
            name: '裱糊与软包工程',
            documents: [
              { name: '壁纸、墙布合格证', required: true },
              { name: '胶粘剂合格证及环保检测报告', required: true },
              { name: '软包面料及内衬材料合格证', required: true },
            ],
          },
          {
            name: '细部工程',
            documents: [
              { name: '橱柜、家具材料合格证', required: true },
              { name: '窗帘盒、窗台板材料合格证', required: true },
              { name: '门窗套、护栏材料合格证', required: true },
              { name: '花饰制作材料合格证', required: true },
            ],
          },
        ],
      },
      {
        name: '隐蔽验收记录',
        description: '各分项工程隐蔽验收记录',
        categories: [
          {
            name: '抹灰工程隐蔽',
            documents: [
              { name: '抹灰基层隐蔽验收记录', required: true },
              { name: '加强网隐蔽验收记录', required: true },
            ],
          },
          {
            name: '门窗工程隐蔽',
            documents: [
              { name: '门窗预埋件和锚固件隐蔽验收记录', required: true },
              { name: '门窗框与墙体缝隙填嵌隐蔽验收记录', required: true },
              { name: '隐蔽部位的防腐、填嵌处理记录', required: true },
            ],
          },
          {
            name: '吊顶工程隐蔽',
            documents: [
              { name: '吊顶内管道、设备安装记录', required: true },
              { name: '吊顶龙骨安装隐蔽验收记录', required: true },
              { name: '吊顶内填充吸声材料验收记录', required: true },
              { name: '防火、防腐处理记录', required: true },
            ],
          },
          {
            name: '轻质隔墙工程隐蔽',
            documents: [
              { name: '轻质隔墙板材安装隐蔽验收记录', required: true },
              { name: '隔墙内管线安装验收记录', required: true },
              { name: '隔墙龙骨安装隐蔽验收记录', required: true },
            ],
          },
          {
            name: '饰面板（砖）工程隐蔽',
            documents: [
              { name: '饰面板（砖）基层隐蔽验收记录', required: true },
              { name: '饰面板安装连接节点隐蔽验收记录', required: true },
              { name: '防水层隐蔽验收记录', required: true },
            ],
          },
          {
            name: '细部工程隐蔽',
            documents: [
              { name: '橱柜预埋件隐蔽验收记录', required: true },
              { name: '护栏预埋件隐蔽验收记录', required: true },
              { name: '花饰预埋件隐蔽验收记录', required: true },
            ],
          },
        ],
      },
      {
        name: '竣工图',
        description: '装饰装修工程竣工图纸',
        categories: [
          {
            name: '平面布置竣工图',
            documents: [
              { name: '平面布置竣工图', required: true },
              { name: '墙体定位竣工图', required: true },
              { name: '地面铺装竣工图', required: true },
              { name: '顶棚布置竣工图', required: true },
            ],
          },
          {
            name: '立面及节点竣工图',
            documents: [
              { name: '墙面装饰竣工图', required: true },
              { name: '立面装饰竣工图', required: true },
              { name: '装饰节点详图', required: true },
              { name: '固定家具竣工图', required: true },
            ],
          },
          {
            name: '机电安装竣工图',
            documents: [
              { name: '强弱电布置竣工图', required: true },
              { name: '给排水布置竣工图', required: true },
              { name: '消防布置竣工图', required: true },
              { name: '空调通风竣工图', required: true },
            ],
          },
        ],
      },
      {
        name: '验收记录',
        description: '各分部、分项、检验批及竣工验收记录',
        categories: [
          {
            name: '分部工程验收',
            documents: [
              { name: '抹灰分项工程质量验收记录', required: true },
              { name: '门窗分项工程质量验收记录', required: true },
              { name: '吊顶分项工程质量验收记录', required: true },
              { name: '轻质隔墙分项工程质量验收记录', required: true },
              { name: '饰面板（砖）分项工程质量验收记录', required: true },
              { name: '涂饰分项工程质量验收记录', required: true },
              { name: '裱糊与软包分项工程质量验收记录', required: true },
              { name: '细部分项工程质量验收记录', required: true },
            ],
          },
          {
            name: '竣工验收',
            documents: [
              { name: '装饰装修分部工程验收记录', required: true },
              { name: '单位工程质量竣工验收记录', required: true },
              { name: '室内环境检测报告', required: true },
              { name: '消防验收意见书', required: true },
              { name: '工程竣工验收报告', required: true },
            ],
          },
        ],
      },
    ],
  },
};

export { createId };
