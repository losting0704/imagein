// /js/modules/config/hmi.js
// 專門存放 HMI 介面相關的版面配置與欄位設定

// 1. HMI 區塊的背景圖檔名
export const hmiLayouts = {
  vt8: {
    monitor1: "./img/vt8-hmi-monitor-1.svg",
    monitor2: "./img/vt8-hmi-monitor-2.svg",
    pid1: "./img/vt8-hmi-pid-1.svg",
    pid2: "./img/vt8-hmi-pid-2.svg",
  },
  vt7: {
    monitor1: "./img/vt7-hmi-monitor-1.svg",
    monitor2: "./img/vt7-hmi-monitor-2.svg",
    pid1: "./img/vt7-hmi-pid-1.svg",
  },
  vt6: {
    monitor1: "./img/vt6-hmi-monitor-1.svg",
    monitor2: "./img/vt6-hmi-monitor-2.svg",
    pid1: "./img/vt6-hmi-pid-1.svg",
  },
  vt5: {
    monitor1: "./img/vt5-hmi-monitor-1.svg",
    monitor2: "./img/vt5-hmi-monitor-2.svg",
    pid1: "./img/vt5-hmi-pid-1.svg",
  },
  vt1: {
    monitor1: "./img/vt1-hmi-monitor-1.svg",
    monitor2: "./img/vt1-hmi-monitor-2.svg",
    pid1: "./img/vt1-hmi-pid-1.svg",
  },
};

// 2. 各機型 HMI 區塊中的所有欄位
export const hmiFieldsByModel = {
  vt8: {
    monitor1: [
      {
        id: "monitor_FT_C1",
        label: "1. FT C-1<small>(CCM)</small>",
        position: { top: "10%", left: "10%", width: "15%", height: "10%" },
      },
      {
        id: "monitor_LEL_C1",
        label: "2. LEL C-1<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "30%", width: "15%", height: "10%" },
      },
      {
        id: "monitor_FTA_1_2",
        label: "3. FTA-1-2<small>(CCM)</small>",
        position: { top: "10%", left: "50%", width: "15%", height: "10%" },
      },
      {
        id: "monitor_XVA_1_2",
        label: "4. XVA-1-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "70%", width: "15%", height: "10%" },
      },
      {
        id: "monitor_XV1_1_2",
        label: "5. XV1-1-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "25%", left: "10%", width: "15%", height: "10%" },
      },
      {
        id: "monitor_PDT4_2",
        label: "6. PDT4-2<small>(mmAq)</small>",
        position: { top: "25%", left: "30%", width: "15%", height: "10%" },
      },
      {
        id: "monitor_FTA_2_2",
        label: "7. FTA-2-2<small>(CCM)</small>",
        position: { top: "25%", left: "50%", width: "15%", height: "10%" },
      },
      {
        id: "monitor_XVA_2_2",
        label: "8. XVA-2-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "25%", left: "70%", width: "15%", height: "10%" },
      },
      {
        id: "monitor_PDT3_2",
        label: "9. PDT3-2<small>(mmAq)</small>",
        position: { top: "40%", left: "10%", width: "15%", height: "10%" },
      },
      {
        id: "monitor_XV1_2_2",
        label: "10. XV1-2-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "40%", left: "30%", width: "15%", height: "10%" },
      },
      {
        id: "monitor_PDT1_2",
        label: "11. PDT1-2<small>(mmAq)</small>",
        position: { top: "40%", left: "50%", width: "15%", height: "10%" },
      },
      {
        id: "monitor_FT1_2",
        label: "12. FT1-2<small>(CCM)</small>",
        position: { top: "40%", left: "70%", width: "15%", height: "10%" },
      },
      {
        id: "monitor_TE1_2",
        label: "13. TE1-2<small>(℃)</small>",
        position: { top: "55%", left: "10%", width: "15%", height: "10%" },
      },
    ],
    monitor2: [
      {
        id: "monitor_F4_4_relay",
        label: "14. F4-4中繼<small>(Hz)</small>",
        position: { top: "10%", left: "10%", width: "15%", height: "15%" },
      },
      {
        id: "monitor_PDT2_2",
        label: "15. PDT2-2<small>(mmAq)</small>",
        position: { top: "10%", left: "30%", width: "15%", height: "15%" },
      },
      {
        id: "monitor_XV2_2",
        label: "16. XV2-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "50%", width: "15%", height: "15%" },
      },
      {
        id: "monitor_LEL1_2",
        label: "17. LEL1-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "70%", width: "15%", height: "15%" },
      },
      {
        id: "monitor_TE7_2",
        label: "18. TE7-2<small>(℃)</small>",
        position: { top: "30%", left: "10%", width: "15%", height: "15%" },
      },
      {
        id: "monitor_F1_B_burn",
        label: "19. F1-B燃燒<small>(Hz)</small>",
        position: { top: "30%", left: "30%", width: "15%", height: "15%" },
      },
    ],
    pid1: [
      {
        id: "pid_F1_B_burn_SV",
        label: "20. F1-B燃燒/SV<small>(mmAq)</small>",
        position: { top: "10%", left: "10%", width: "15%", height: "20%" },
      },
      {
        id: "pid_F1_B_burn_Min",
        label: "21. F1-B燃燒/Min<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "30%", width: "15%", height: "20%" },
      },
      {
        id: "pid_F1_B_burn_Max",
        label: "22. F1-B燃燒/Max<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "50%", width: "15%", height: "20%" },
      },
      {
        id: "pid_F4_B_burn_SV",
        label: "23. F4-B燃燒/SV<small>(mmAq)</small>",
        position: { top: "40%", left: "10%", width: "15%", height: "20%" },
      },
      {
        id: "pid_F4_B_burn_Min",
        label: "24. F4-B燃燒/Min<small>(%)</small>",
        validation: "percentage",
        position: { top: "40%", left: "30%", width: "15%", height: "20%" },
      },
      {
        id: "pid_F4_B_burn_Max",
        label: "25. F4-B燃燒/Max<small>(%)</small>",
        validation: "percentage",
        position: { top: "40%", left: "50%", width: "15%", height: "20%" },
      },
    ],
    pid2: [
      {
        id: "pid_XV1_1_2_SV",
        label: "26. XV1-1-2/SV<small>(mmAq)</small>",
        position: { top: "10%", left: "10%", width: "15%", height: "20%" },
      },
      {
        id: "pid_XV1_1_2_Min",
        label: "27. XV1-1-2/Min<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "30%", width: "15%", height: "20%" },
      },
      {
        id: "pid_XV1_1_2_Max",
        label: "28. XV1-1-2/Max<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "50%", width: "15%", height: "20%" },
      },
      {
        id: "pid_XV1_2_2_SV",
        label: "29. XV1-2-2/SV<small>(mmAq)</small>",
        position: { top: "40%", left: "10%", width: "15%", height: "20%" },
      },
      {
        id: "pid_XV1_2_2_Min",
        label: "30. XV1-2-2/Min<small>(%)</small>",
        validation: "percentage",
        position: { top: "40%", left: "30%", width: "15%", height: "20%" },
      },
      {
        id: "pid_XV1_2_2_Max",
        label: "31. XV1-2-2/Max<small>(%)</small>",
        validation: "percentage",
        position: { top: "40%", left: "50%", width: "15%", height: "20%" },
      },
    ],
  },
  vt7: {
    monitor1: [
      {
        id: "vt7_monitor_1",
        label: "1. FT 1-2<small>(CCM)</small>",
        position: { top: "10%", left: "10%", width: "15%", height: "10%" },
      },
      {
        id: "vt7_monitor_2",
        label: "2. XVB-2<small>(mm/s)</small>",
        position: { top: "10%", left: "30%", width: "15%", height: "10%" },
      },
      {
        id: "vt7_monitor_3",
        label: "3. FB-2桶槽<small>(Hz)</small>",
        position: { top: "10%", left: "50%", width: "15%", height: "10%" },
      },
      {
        id: "vt7_monitor_4",
        label: "4. FTA-2-1<small>(CMM)</small>",
        position: { top: "10%", left: "70%", width: "15%", height: "10%" },
      },
      {
        id: "vt7_monitor_5",
        label: "5. XVA-2-1<small>(%)</small>",
        validation: "percentage",
        position: { top: "25%", left: "10%", width: "15%", height: "10%" },
      },
      {
        id: "vt7_monitor_6",
        label: "6. XV1-2-1<small>(%)</small>",
        validation: "percentage",
        position: { top: "25%", left: "30%", width: "15%", height: "10%" },
      },
      {
        id: "vt7_monitor_7",
        label: "7. PDT3-3<small>(mmAq)</small>",
        position: { top: "25%", left: "50%", width: "15%", height: "10%" },
      },
      {
        id: "vt7_monitor_8",
        label: "8. FTA-2-2<small>(CMM)</small>",
        position: { top: "25%", left: "70%", width: "15%", height: "10%" },
      },
      {
        id: "vt7_monitor_9",
        label: "9. XVA-2-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "40%", left: "10%", width: "15%", height: "10%" },
      },
      {
        id: "vt7_monitor_10",
        label: "10. PDT3-4<small>(mmAq)</small>",
        position: { top: "40%", left: "30%", width: "15%", height: "10%" },
      },
      {
        id: "vt7_monitor_11",
        label: "11. XV1-2-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "40%", left: "50%", width: "15%", height: "10%" },
      },
      {
        id: "vt7_monitor_12",
        label: "12. TE1-2<small>(℃)</small>",
        position: { top: "40%", left: "70%", width: "15%", height: "10%" },
      },
      {
        id: "vt7_monitor_13",
        label: "13. FT1-2<small>(CMM)</small>",
        position: { top: "55%", left: "10%", width: "15%", height: "10%" },
      },
    ],
    monitor2: [
      {
        id: "vt7_monitor_14",
        label: "14. LEL1-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "10%", width: "15%", height: "15%" },
      },
      {
        id: "vt7_monitor_15",
        label: "15. PDT2-2<small>(mmAq)</small>",
        position: { top: "10%", left: "30%", width: "15%", height: "15%" },
      },
      {
        id: "vt7_monitor_16",
        label: "16. XV2-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "50%", width: "15%", height: "15%" },
      },
      {
        id: "vt7_monitor_17",
        label: "17. F1-B燃燒<small>(mm/s)</small>",
        position: { top: "10%", left: "70%", width: "15%", height: "15%" },
      },
      {
        id: "vt7_monitor_18",
        label: "18. F1-B燃燒<small>(Hz)</small>",
        position: { top: "30%", left: "10%", width: "15%", height: "15%" },
      },
      {
        id: "vt7_monitor_19",
        label: "19. TE7-2<small>(℃)</small>",
        position: { top: "30%", left: "30%", width: "15%", height: "15%" },
      },
    ],
    pid1: [
      {
        id: "vt7_pid_20",
        label: "20. XV1-2-1/SV<small>(mmAq)</small>",
        position: { top: "10%", left: "10%", width: "15%", height: "20%" },
      },
      {
        id: "vt7_pid_21",
        label: "21. XV1-2-1/Min<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "30%", width: "15%", height: "20%" },
      },
      {
        id: "vt7_pid_22",
        label: "22. XV1-2-1/Max<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "50%", width: "15%", height: "20%" },
      },
      {
        id: "vt7_pid_23",
        label: "23. XV1-2-2/SV<small>(mmAq)</small>",
        position: { top: "40%", left: "10%", width: "15%", height: "20%" },
      },
      {
        id: "vt7_pid_24",
        label: "24. XV1-2-2/Min<small>(%)</small>",
        validation: "percentage",
        position: { top: "40%", left: "30%", width: "15%", height: "20%" },
      },
      {
        id: "vt7_pid_25",
        label: "25. XV1-2-2/Max<small>(%)</small>",
        validation: "percentage",
        position: { top: "40%", left: "50%", width: "15%", height: "20%" },
      },
    ],
  },
  vt6: {
    monitor1: [
      {
        id: "vt6_monitor_1",
        label: "1. FT 1-2<small>(CMM)</small>",
        position: { top: "10%", left: "10%", width: "15%", height: "10%" },
      },
      {
        id: "vt6_monitor_2",
        label: "2. XVA-1-1<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "30%", width: "15%", height: "10%" },
      },
      {
        id: "vt6_monitor_3",
        label: "3. PDT3-1<small>(mmAq)</small>",
        position: { top: "10%", left: "50%", width: "15%", height: "10%" },
      },
      {
        id: "vt6_monitor_4",
        label: "4. XV1-1-1<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "70%", width: "15%", height: "10%" },
      },
      {
        id: "vt6_monitor_5",
        label: "5. FTA-2-1<small>(CMM)</small>",
        position: { top: "25%", left: "10%", width: "15%", height: "10%" },
      },
      {
        id: "vt6_monitor_6",
        label: "6. XVA-1-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "25%", left: "30%", width: "15%", height: "10%" },
      },
      {
        id: "vt6_monitor_7",
        label: "7. PDT3-2<small>(mmAq)</small>",
        position: { top: "25%", left: "50%", width: "15%", height: "10%" },
      },
      {
        id: "vt6_monitor_8",
        label: "8. XV1-1-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "25%", left: "70%", width: "15%", height: "10%" },
      },
      {
        id: "vt6_monitor_9",
        label: "9. TE1-2<small>(℃)</small>",
        position: { top: "40%", left: "10%", width: "15%", height: "10%" },
      },
      {
        id: "vt6_monitor_10",
        label: "10. FT1-1<small>(CMM)</small>",
        position: { top: "40%", left: "30%", width: "15%", height: "10%" },
      },
    ],
    monitor2: [
      {
        id: "vt6_monitor_11",
        label: "11. LEL1-1<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "10%", width: "15%", height: "15%" },
      },
      {
        id: "vt6_monitor_12",
        label: "12. PDT2-1<small>(mmAq)</small>",
        position: { top: "10%", left: "30%", width: "15%", height: "15%" },
      },
      {
        id: "vt6_monitor_13",
        label: "13. XV2-1<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "50%", width: "15%", height: "15%" },
      },
      {
        id: "vt6_monitor_14",
        label: "14. F1-A燃燒<small>(mm/s)</small>",
        position: { top: "10%", left: "70%", width: "15%", height: "15%" },
      },
      {
        id: "vt6_monitor_15",
        label: "15. F1-A燃燒<small>(Hz)</small>",
        position: { top: "30%", left: "10%", width: "15%", height: "15%" },
      },
      {
        id: "vt6_monitor_16",
        label: "16. TE7-1<small>(℃)</small>",
        position: { top: "30%", left: "30%", width: "15%", height: "15%" },
      },
    ],
    pid1: [
      {
        id: "vt6_pid_17",
        label: "17. XV1-1-1/SV<small>(mmAq)</small>",
        position: { top: "10%", left: "10%", width: "15%", height: "20%" },
      },
      {
        id: "vt6_pid_18",
        label: "18. XV1-1-1/Min<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "30%", width: "15%", height: "20%" },
      },
      {
        id: "vt6_pid_19",
        label: "19. XV1-1-1/Max<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "50%", width: "15%", height: "20%" },
      },
      {
        id: "vt6_pid_20",
        label: "20. XV1-1-2/SV<small>(mmAq)</small>",
        position: { top: "40%", left: "10%", width: "15%", height: "20%" },
      },
      {
        id: "vt6_pid_21",
        label: "21. XV1-1-2/Min<small>(%)</small>",
        validation: "percentage",
        position: { top: "40%", left: "30%", width: "15%", height: "20%" },
      },
      {
        id: "vt6_pid_22",
        label: "22. XV1-1-2/Max<small>(%)</small>",
        validation: "percentage",
        position: { top: "40%", left: "50%", width: "15%", height: "20%" },
      },
    ],
  },
  vt5: {
    monitor1: [
      {
        id: "vt5_monitor_1",
        label: "1. FTA-1-2<small>(CMM)</small>",
        position: { top: "10%", left: "10%", width: "15%", height: "10%" },
      },
      {
        id: "vt5_monitor_2",
        label: "2. XVA-1-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "30%", width: "15%", height: "10%" },
      },
      {
        id: "vt5_monitor_3",
        label: "3. XV1-1-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "10%", left: "50%", width: "15%", height: "10%" },
      },
      {
        id: "vt5_monitor_4",
        label: "4. PDT1-2<small>(mmAq)</small>",
        position: { top: "10%", left: "70%", width: "15%", height: "10%" },
      },
      {
        id: "vt5_monitor_5",
        label: "5. FTA-2-2<small>(CMM)</small>",
        position: { top: "25%", left: "10%", width: "15%", height: "10%" },
      },
      {
        id: "vt5_monitor_6",
        label: "6. XVA-2-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "25%", left: "30%", width: "15%", height: "10%" },
      },
      {
        id: "vt5_monitor_7",
        label: "7. PDT3-2<small>(mmAq)</small>",
        position: { top: "25%", left: "50%", width: "15%", height: "10%" },
      },
      {
        id: "vt5_monitor_8",
        label: "8. XV1-2-2<small>(%)</small>",
        validation: "percentage",
        position: { top: "25%", left: "70%", width: "15%", height: "10%" },
      },
      {
        id: "vt5_monitor_9",
        label: "9. FT1-2<small>(CMM)</small>",
        position: { top: "40%", left: "10%", width: "15%", height: "10%" },
      },
      {
        id: "vt5_monitor_10",
        label: "10. TE1-2<small>(℃)</small>",
        position: { top: "40%", left: "30%", width: "15%", height: "10%" },
      },
      {
        id: "vt5_monitor_11",
        label: "11. F-4-2中繼<small>(Hz)</small>",
        position: { top: "40%", left: "50%", width: "15%", height: "10%" },
      },
    ],
    monitor2: [],
    pid1: [],
  },
  vt1: { monitor1: [], monitor2: [], pid1: [] },
};
