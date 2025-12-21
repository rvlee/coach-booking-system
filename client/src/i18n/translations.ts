export type Language = 'en' | 'zh-TW';

export interface Translations {
  dashboard: {
    welcome: string;
    subtitle: string;
    logout: string;
    slots: string;
    bookings: string;
    settings: string;
  };
  settings: {
    title: string;
    timezone: {
      label: string;
      description: string;
    };
    dailyLimit: {
      label: string;
      description: string;
      hint: string;
    };
    language: {
      label: string;
      description: string;
    };
    save: string;
    saving: string;
    saved: string;
    error: string;
    loading: string;
  };
  slots: {
    title: string;
    create: string;
    yourSlots: string;
    noSlots: string;
    bookingLink: string;
    loading: string;
    available: string;
    booked: string;
    edit: string;
    delete: string;
    save: string;
    cancel: string;
    saving: string;
  };
  bookings: {
    title: string;
    noBookings: string;
    sharedClass: string;
    willingToShare: string;
    email: string;
    phone: string;
    sessionTime: string;
    duration: string;
    notes: string;
  };
  createSlot: {
    title: string;
    connectGoogle: string;
    googleConnected: string;
    refreshBusy: string;
    refreshing: string;
    createAll: string;
    creating: string;
    slotsReady: string;
    enableDays: string;
  };
  bookingPage: {
    title: string;
    selectSlot: string;
    noSlots: string;
    alreadyBooked: string;
    fullName: string;
    email: string;
    phone: string;
    notes: string;
    willingToShare: string;
    willingToShareHint: string;
    confirm: string;
    booking: string;
    confirmed: string;
    details: string;
    name: string;
    time: string;
    type: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    dashboard: {
      welcome: 'Welcome',
      subtitle: 'Manage your booking slots',
      logout: 'Logout',
      slots: 'Slots',
      bookings: 'Bookings',
      settings: 'Settings'
    },
    settings: {
      title: 'Settings',
      timezone: {
        label: 'Timezone',
        description: 'Set your timezone to ensure slots are created and displayed in your local time.'
      },
      dailyLimit: {
        label: 'Maximum bookings per day',
        description: 'Set the maximum number of bookings allowed per day. Once reached, no more bookings will be accepted for that day. Leave empty for no limit.',
        hint: 'Leave empty to allow unlimited bookings per day'
      },
      language: {
        label: 'Language',
        description: 'Choose your preferred language for the interface.'
      },
      save: 'Save Settings',
      saving: 'Saving...',
      saved: 'Settings saved successfully!',
      error: 'Failed to save settings',
      loading: 'Loading settings...'
    },
    slots: {
      title: 'Your Slots',
      create: 'Create Slots',
      yourSlots: 'Your Slots',
      noSlots: 'No slots created yet. Create your first slot above!',
      bookingLink: 'Your Booking Link:',
      loading: 'Loading booking link...',
      available: 'Available',
      booked: 'Booked',
      edit: 'Edit slot',
      delete: 'Delete slot',
      save: 'Save',
      cancel: 'Cancel',
      saving: 'Saving...'
    },
    bookings: {
      title: 'All Bookings',
      noBookings: 'No bookings yet. Share your booking links with clients!',
      sharedClass: 'Shared Class',
      willingToShare: 'Willing to Share',
      email: 'Email',
      phone: 'Phone',
      sessionTime: 'Session Time',
      duration: 'Duration',
      notes: 'Notes'
    },
    createSlot: {
      title: 'Create Slots',
      connectGoogle: 'Connect Google Calendar',
      googleConnected: 'Google Calendar connected',
      refreshBusy: 'Refresh busy',
      refreshing: 'Refreshing...',
      createAll: 'Create All Slots',
      creating: 'Creating...',
      slotsReady: 'slot(s) ready',
      enableDays: 'Enable days and configure times above'
    },
    bookingPage: {
      title: 'Book Your Session',
      selectSlot: 'Select a Time Slot',
      noSlots: 'No available slots',
      alreadyBooked: 'This slot is already booked',
      fullName: 'Full Name *',
      email: 'Email *',
      phone: 'Phone Number',
      notes: 'Notes (Optional)',
      willingToShare: "I'm willing to share this class with someone else",
      willingToShareHint: 'If checked, you may be paired with another participant. If paired, the session will be extended to 90 minutes.',
      confirm: 'Confirm Booking',
      booking: 'Booking...',
      confirmed: 'Booking Confirmed!',
      details: 'Booking Details',
      name: 'Name:',
      time: 'Time:',
      type: 'Type:'
    }
  },
  'zh-TW': {
    dashboard: {
      welcome: '歡迎',
      subtitle: '管理您的預約時段',
      logout: '登出',
      slots: '時段',
      bookings: '預約',
      settings: '設定'
    },
    settings: {
      title: '設定',
      timezone: {
        label: '時區',
        description: '設定您的時區，確保時段以您的本地時間建立和顯示。'
      },
      dailyLimit: {
        label: '每日最大預約數',
        description: '設定每日允許的最大預約數量。達到上限後，當天將不再接受預約。留空表示無限制。',
        hint: '留空以允許每日無限制預約'
      },
      language: {
        label: '語言',
        description: '選擇您偏好的介面語言。'
      },
      save: '儲存設定',
      saving: '儲存中...',
      saved: '設定已成功儲存！',
      error: '儲存設定失敗',
      loading: '載入設定中...'
    },
    slots: {
      title: '您的時段',
      create: '建立時段',
      yourSlots: '您的時段',
      noSlots: '尚未建立時段。請在上方建立您的第一個時段！',
      bookingLink: '您的預約連結：',
      loading: '載入預約連結中...',
      available: '可預約',
      booked: '已預約',
      edit: '編輯時段',
      delete: '刪除時段',
      save: '儲存',
      cancel: '取消',
      saving: '儲存中...'
    },
    bookings: {
      title: '所有預約',
      noBookings: '尚無預約。與客戶分享您的預約連結！',
      sharedClass: '共享課程',
      willingToShare: '願意共享',
      email: '電子郵件',
      phone: '電話',
      sessionTime: '課程時間',
      duration: '時長',
      notes: '備註'
    },
    createSlot: {
      title: '建立時段',
      connectGoogle: '連接 Google 日曆',
      googleConnected: 'Google 日曆已連接',
      refreshBusy: '重新整理忙碌時間',
      refreshing: '重新整理中...',
      createAll: '建立所有時段',
      creating: '建立中...',
      slotsReady: '個時段已準備就緒',
      enableDays: '請在上方啟用日期並設定時間'
    },
    bookingPage: {
      title: '預約您的課程',
      selectSlot: '選擇時段',
      noSlots: '無可用時段',
      alreadyBooked: '此時段已被預約',
      fullName: '全名 *',
      email: '電子郵件 *',
      phone: '電話號碼',
      notes: '備註（選填）',
      willingToShare: '我願意與他人共享此課程',
      willingToShareHint: '如果勾選，您可能會與另一位參與者配對。如果配對成功，課程將延長至 90 分鐘。',
      confirm: '確認預約',
      booking: '預約中...',
      confirmed: '預約已確認！',
      details: '預約詳情',
      name: '姓名：',
      time: '時間：',
      type: '類型：'
    }
  }
};




